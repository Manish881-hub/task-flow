"""Behavior tests through public HTTP interfaces (routers as seams)."""
from __future__ import annotations

import os

os.environ["DATABASE_URL"] = "sqlite:///./test_taskflow.db"
os.environ["JWT_SECRET"] = "test-secret-min-32-chars-1234567890"
os.environ["JWT_EXPIRES_MIN"] = "15"
os.environ["REFRESH_DAYS"] = "7"
os.environ["CORS_ORIGINS"] = "http://localhost:3000"
os.environ["ENV"] = "test"
os.environ["RATE_LIMIT_ENABLED"] = "false"

import uuid
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.core.security import hash_token
from app.db import session as dbsession
from app.db.base import Base
from app.db.models import RefreshToken, User
from app.db.session import init_engine
from app.main import create_app

app = create_app()


@pytest.fixture()
def client():
    if os.path.exists("./test_taskflow.db"):
        os.remove("./test_taskflow.db")
    init_engine("sqlite:///./test_taskflow.db")
    from app.db.session import engine

    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    if os.path.exists("./test_taskflow.db"):
        os.remove("./test_taskflow.db")


def signup(client: TestClient, name="Alice", email="alice@example.com", pw="password123"):
    r = client.post("/api/v1/auth/signup", json={"name": name, "email": email, "password": pw})
    assert r.status_code == 201, r.text
    return r.json()["data"]


def login(client: TestClient, email="alice@example.com", pw="password123"):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": pw})
    assert r.status_code == 200, r.text
    return r.json()["data"]


def authz(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def make_project(client: TestClient, token: str, name="P1"):
    r = client.post("/api/v1/projects", json={"name": name, "description": "d"}, headers=authz(token))
    assert r.status_code == 201, r.text
    assert "location" in {k.lower(): v for k, v in r.headers.items()}
    return r.json()["data"]


def test_signup_login_me(client):
    signup(client)
    data = login(client)
    assert data["access_token"]
    r = client.get("/api/v1/auth/me", headers=authz(data["access_token"]))
    assert r.status_code == 200
    assert r.json()["data"]["email"] == "alice@example.com"


def test_signup_password_rules(client):
    r = client.post("/api/v1/auth/signup", json={"name": "X", "email": "x@example.com", "password": "short1"})
    assert r.status_code == 422
    r = client.post("/api/v1/auth/signup", json={"name": "X", "email": "x@example.com", "password": "nonumbers!"})
    assert r.status_code == 422
    r = client.post("/api/v1/auth/signup", json={"name": "X", "email": "x@example.com", "password": "password123"})
    assert r.status_code == 201


def test_refresh_rotation(client):
    signup(client)
    login(client)
    old_cookie = client.cookies.get("refresh_token")
    assert old_cookie
    r1 = client.post("/api/v1/auth/refresh")
    assert r1.status_code == 200, r1.text
    new_cookie = client.cookies.get("refresh_token")
    assert new_cookie and new_cookie != old_cookie
    # reuse of old token must be rejected
    client.cookies.set("refresh_token", old_cookie, path="/api/v1/auth")
    r2 = client.post("/api/v1/auth/refresh")
    assert r2.status_code == 401, r2.text
    # logout revokes current token
    client.cookies.set("refresh_token", new_cookie, path="/api/v1/auth")
    r3 = client.post("/api/v1/auth/logout")
    assert r3.status_code == 200
    client.cookies.set("refresh_token", new_cookie, path="/api/v1/auth")
    r4 = client.post("/api/v1/auth/refresh")
    assert r4.status_code == 401


def test_refresh_missing_token_401(client):
    client.cookies.clear()
    r = client.post("/api/v1/auth/refresh")
    assert r.status_code == 401


def test_naive_datetime_handling(client):
    """SQLite returns naive datetimes; refresh must not crash with naive-vs-aware TypeError."""
    signup(client)
    data = login(client)
    uid = data["user"]["id"]
    db = dbsession.SessionLocal()
    try:
        naive_future = datetime.now() + timedelta(days=1)  # naive on purpose
        raw = "naive-test-token-" + uuid.uuid4().hex
        db.add(RefreshToken(user_id=uuid.UUID(uid), token_hash=hash_token(raw), expires_at=naive_future, revoked=False))
        naive_past = datetime.now() - timedelta(days=1)
        raw_exp = "naive-expired-" + uuid.uuid4().hex
        db.add(RefreshToken(user_id=uuid.UUID(uid), token_hash=hash_token(raw_exp), expires_at=naive_past, revoked=False))
        db.commit()
    finally:
        db.close()
    client.cookies.set("refresh_token", raw, path="/api/v1/auth")
    r = client.post("/api/v1/auth/refresh")
    assert r.status_code == 200, r.text
    client.cookies.set("refresh_token", raw_exp, path="/api/v1/auth")
    r = client.post("/api/v1/auth/refresh")
    assert r.status_code == 401, r.text  # expired, not 500


def test_invite_and_permissions(client):
    signup(client, "Alice", "alice@example.com")
    signup(client, "Bob", "bob@example.com")
    a = login(client, "alice@example.com")
    b = login(client, "bob@example.com")
    p = make_project(client, a["access_token"])
    # non-member cannot read
    r = client.get(f"/api/v1/projects/{p['id']}", headers=authz(b["access_token"]))
    assert r.status_code == 403, r.text
    # invite bob
    r = client.post(
        f"/api/v1/projects/{p['id']}/members",
        json={"email": "bob@example.com", "role": "member"},
        headers=authz(a["access_token"]),
    )
    assert r.status_code == 201, r.text
    # member can read detail with manual members list
    r = client.get(f"/api/v1/projects/{p['id']}", headers=authz(b["access_token"]))
    assert r.status_code == 200
    body = r.json()["data"]
    assert "members" in body and "task_counts" in body
    emails = {m["email"] for m in body["members"]}
    assert {"alice@example.com", "bob@example.com"} <= emails
    # member cannot patch/delete (owner only)
    r = client.patch(f"/api/v1/projects/{p['id']}", json={"name": "X"}, headers=authz(b["access_token"]))
    assert r.status_code == 403
    r = client.delete(f"/api/v1/projects/{p['id']}", headers=authz(b["access_token"]))
    assert r.status_code == 403
    # member cannot invite
    signup(client, "Carol", "carol@example.com")
    r = client.post(
        f"/api/v1/projects/{p['id']}/members",
        json={"email": "carol@example.com"},
        headers=authz(b["access_token"]),
    )
    assert r.status_code == 403
    # owner cannot remove owner
    me = client.get("/api/v1/auth/me", headers=authz(a["access_token"])).json()["data"]
    r = client.delete(f"/api/v1/projects/{p['id']}/members/{me['id']}", headers=authz(a["access_token"]))
    assert r.status_code == 422


def test_task_done_rule_and_validations(client):
    signup(client, "Alice", "alice@example.com")
    signup(client, "Bob", "bob@example.com")
    a = login(client, "alice@example.com")
    b = login(client, "bob@example.com")
    p = make_project(client, a["access_token"])
    client.post(f"/api/v1/projects/{p['id']}/members", json={"email": "bob@example.com"}, headers=authz(a["access_token"]))
    bob_me = client.get("/api/v1/auth/me", headers=authz(b["access_token"])).json()["data"]
    # past due rejected
    r = client.post(
        f"/api/v1/projects/{p['id']}/tasks",
        json={"title": "T", "due_date": "2000-01-01T00:00:00Z"},
        headers=authz(a["access_token"]),
    )
    assert r.status_code == 422, r.text
    # non-member assignee rejected
    r = client.post(
        f"/api/v1/projects/{p['id']}/tasks",
        json={"title": "T", "assignee_id": str(uuid.uuid4())},
        headers=authz(a["access_token"]),
    )
    assert r.status_code == 422, r.text
    # create assigned to bob
    r = client.post(
        f"/api/v1/projects/{p['id']}/tasks",
        json={"title": "T1", "assignee_id": bob_me["id"]},
        headers=authz(a["access_token"]),
    )
    assert r.status_code == 201, r.text
    tid = r.json()["data"]["id"]
    # create unassigned
    r = client.post(f"/api/v1/projects/{p['id']}/tasks", json={"title": "T2"}, headers=authz(a["access_token"]))
    tid2 = r.json()["data"]["id"]
    # bob (assignee) can mark Done, completed_at set
    r = client.patch(
        f"/api/v1/projects/{p['id']}/tasks/{tid}", json={"status": "Done"}, headers=authz(b["access_token"])
    )
    assert r.status_code == 200, r.text
    assert r.json()["data"]["completed_at"] is not None
    # moving back clears completed_at
    r = client.patch(
        f"/api/v1/projects/{p['id']}/tasks/{tid}", json={"status": "In Progress"}, headers=authz(b["access_token"])
    )
    assert r.json()["data"]["completed_at"] is None
    # bob cannot mark unassigned T2 Done (not assignee, not owner)
    r = client.patch(
        f"/api/v1/projects/{p['id']}/tasks/{tid2}", json={"status": "Done"}, headers=authz(b["access_token"])
    )
    assert r.status_code == 403, r.text
    # owner can
    r = client.patch(
        f"/api/v1/projects/{p['id']}/tasks/{tid2}", json={"status": "Done"}, headers=authz(a["access_token"])
    )
    assert r.status_code == 200
    # delete: bob cannot delete T2 (not owner/creator)
    r = client.delete(f"/api/v1/projects/{p['id']}/tasks/{tid2}", headers=authz(b["access_token"]))
    assert r.status_code == 403
    # owner can delete
    r = client.delete(f"/api/v1/projects/{p['id']}/tasks/{tid2}", headers=authz(a["access_token"]))
    assert r.status_code == 204


def test_pagination_and_filters(client):
    signup(client)
    a = login(client)
    for i in range(3):
        make_project(client, a["access_token"], f"P{i}")
    r = client.get("/api/v1/projects?page=1&per_page=2", headers=authz(a["access_token"]))
    assert r.status_code == 200
    body = r.json()
    assert body["meta"]["total"] == 3
    assert body["meta"]["total_pages"] == 2
    assert len(body["data"]) == 2
    assert "links" in body
    p = make_project(client, a["access_token"], "Filter")
    for title, status in (("A", "To Do"), ("B", "Done"), ("C", "In Progress")):
        client.post(f"/api/v1/projects/{p['id']}/tasks", json={"title": title, "status": status}, headers=authz(a["access_token"]))
    r = client.get(f"/api/v1/projects/{p['id']}/tasks?status=Done", headers=authz(a["access_token"]))
    assert r.json()["meta"]["total"] == 1
    r = client.get(f"/api/v1/projects/{p['id']}/tasks?search=A", headers=authz(a["access_token"]))
    assert r.json()["meta"]["total"] == 1
    # comments
    tid = client.get(f"/api/v1/projects/{p['id']}/tasks?search=B", headers=authz(a["access_token"])).json()["data"][0]["id"]
    r = client.post(f"/api/v1/projects/{p['id']}/tasks/{tid}/comments", json={"content": "hi"}, headers=authz(a["access_token"]))
    assert r.status_code == 201
    r = client.get(f"/api/v1/projects/{p['id']}/tasks/{tid}/comments", headers=authz(a["access_token"]))
    assert len(r.json()["data"]) == 1


def test_health_ready(client):
    assert client.get("/health").json() == {"status": "ok"}
    r = client.get("/ready")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_error_envelope(client):
    r = client.get("/api/v1/projects/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 401
    body = r.json()
    assert "error" in body and body["error"]["code"] == "UNAUTHORIZED"
