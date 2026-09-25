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
from app.db.models import RefreshToken
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


def test_expired_access_token_401_then_refresh_retry(client):
    """Expired access JWT → 401; refresh cookie rotates; retry succeeds."""
    import jwt as pyjwt
    from datetime import timezone

    from app.core.config import settings

    signup(client)
    data = login(client)
    uid = data["user"]["id"]
    # Valid token works.
    r = client.get("/api/v1/auth/me", headers=authz(data["access_token"]))
    assert r.status_code == 200
    # Forged-expired token → 401 (expired, UNAUTHORIZED envelope).
    expired = pyjwt.encode(
        {"sub": uid, "exp": datetime.now(timezone.utc) - timedelta(minutes=5)},
        settings.JWT_SECRET,
        algorithm="HS256",
    )
    r = client.get("/api/v1/auth/me", headers=authz(expired))
    assert r.status_code == 401, r.text
    assert r.json()["error"]["code"] == "UNAUTHORIZED"
    # Refresh via cookie rotates; retry with the new token succeeds.
    old_cookie = client.cookies.get("refresh_token")
    r = client.post("/api/v1/auth/refresh")
    assert r.status_code == 200, r.text
    new_token = r.json()["data"]["access_token"]
    assert client.cookies.get("refresh_token") != old_cookie
    r = client.get("/api/v1/auth/me", headers=authz(new_token))
    assert r.status_code == 200
    assert r.json()["data"]["id"] == uid


def test_refresh_reuse_revokes_family(client):
    """Reusing a revoked refresh token kills all sibling sessions (theft response)."""
    signup(client)
    login(client)
    cookie_a = client.cookies.get("refresh_token")
    login(client)
    cookie_b = client.cookies.get("refresh_token")
    assert cookie_a and cookie_b and cookie_a != cookie_b

    def refresh_with(raw):
        # Per-request cookies bypass the jar (avoids domain/path collisions).
        return client.post("/api/v1/auth/refresh", cookies={"refresh_token": raw})

    # Rotate A → A' valid, A revoked.
    r = refresh_with(cookie_a)
    assert r.status_code == 200, r.text
    cookie_a2 = r.cookies.get("refresh_token")
    assert cookie_a2 and cookie_a2 != cookie_a
    # Reuse revoked A → 401 + family kill.
    r = refresh_with(cookie_a)
    assert r.status_code == 401, r.text
    # Siblings (A' and B) are dead too.
    assert refresh_with(cookie_a2).status_code == 401
    assert refresh_with(cookie_b).status_code == 401


def test_signup_name_max_length(client):
    r = client.post(
        "/api/v1/auth/signup",
        json={"name": "X" * 101, "email": "long@example.com", "password": "password123"},
    )
    assert r.status_code == 422, r.text
    r = client.post(
        "/api/v1/auth/signup",
        json={"name": "X" * 100, "email": "ok@example.com", "password": "password123"},
    )
    assert r.status_code == 201, r.text


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


def test_non_member_sweep_403(client):
    """Every project-scoped endpoint: no token → 401, non-member → 403.

    Mirrors a direct-API evaluator: authenticated ≠ authorized.
    """
    signup(client, "Alice", "alice@example.com")
    signup(client, "Bob", "bob@example.com")
    a = login(client, "alice@example.com")
    b = login(client, "bob@example.com")
    p = make_project(client, a["access_token"])
    pid = p["id"]
    # Owner creates one task + one comment to probe against.
    r = client.post(f"/api/v1/projects/{pid}/tasks", json={"title": "T"}, headers=authz(a["access_token"]))
    assert r.status_code == 201, r.text
    tid = r.json()["data"]["id"]
    r = client.post(
        f"/api/v1/projects/{pid}/tasks/{tid}/comments",
        json={"content": "hello"},
        headers=authz(a["access_token"]),
    )
    assert r.status_code == 201, r.text

    anon = [
        ("get", f"/api/v1/projects/{pid}", None),
        ("get", f"/api/v1/projects/{pid}/tasks", None),
        ("get", f"/api/v1/projects/{pid}/activity", None),
    ]
    for method, path, body in anon:
        r = client.request(method, path, json=body)
        assert r.status_code == 401, (method, path, r.text)
    # Garbage token → 401, not 500.
    r = client.get(f"/api/v1/projects/{pid}", headers=authz("garbage"))
    assert r.status_code == 401, r.text

    non_member = [
        ("get", f"/api/v1/projects/{pid}", None),
        ("patch", f"/api/v1/projects/{pid}", {"name": "Hacked"}),
        ("delete", f"/api/v1/projects/{pid}", None),
        ("get", f"/api/v1/projects/{pid}/activity", None),
        ("get", f"/api/v1/projects/{pid}/tasks", None),
        ("post", f"/api/v1/projects/{pid}/tasks", {"title": "Hijack"}),
        ("get", f"/api/v1/projects/{pid}/tasks/{tid}", None),
        ("patch", f"/api/v1/projects/{pid}/tasks/{tid}", {"title": "Hijack"}),
        ("delete", f"/api/v1/projects/{pid}/tasks/{tid}", None),
        ("get", f"/api/v1/projects/{pid}/tasks/{tid}/comments", None),
        ("post", f"/api/v1/projects/{pid}/tasks/{tid}/comments", {"content": "spam"}),
    ]
    for method, path, body in non_member:
        r = client.request(method, path, json=body, headers=authz(b["access_token"]))
        assert r.status_code == 403, (method, path, r.text)
        assert r.json()["error"]["code"] == "FORBIDDEN"


def test_member_can_manage_tasks_but_not_membership(client):
    """Req 8 positive proof: a plain member runs the task workflow end to end,
    yet is denied every membership/ownership operation."""
    signup(client, "Alice", "alice@example.com")
    signup(client, "Bob", "bob@example.com")
    signup(client, "Carol", "carol@example.com")
    a = login(client, "alice@example.com")
    b = login(client, "bob@example.com")
    p = make_project(client, a["access_token"])
    pid = p["id"]
    r = client.post(
        f"/api/v1/projects/{pid}/members",
        json={"email": "bob@example.com", "role": "member"},
        headers=authz(a["access_token"]),
    )
    assert r.status_code == 201, r.text
    # Member creates a task.
    r = client.post(
        f"/api/v1/projects/{pid}/tasks", json={"title": "Member task"}, headers=authz(b["access_token"])
    )
    assert r.status_code == 201, r.text
    tid = r.json()["data"]["id"]
    # Member updates it.
    r = client.patch(
        f"/api/v1/projects/{pid}/tasks/{tid}",
        json={"description": "edited by member"},
        headers=authz(b["access_token"]),
    )
    assert r.status_code == 200, r.text
    assert r.json()["data"]["description"] == "edited by member"
    # Member comments on it.
    r = client.post(
        f"/api/v1/projects/{pid}/tasks/{tid}/comments",
        json={"content": "member comment"},
        headers=authz(b["access_token"]),
    )
    assert r.status_code == 201, r.text
    # Member (as creator) deletes their own task.
    r = client.delete(f"/api/v1/projects/{pid}/tasks/{tid}", headers=authz(b["access_token"]))
    assert r.status_code == 204, r.text
    # Same member is denied all membership/ownership operations.
    r = client.post(
        f"/api/v1/projects/{pid}/members",
        json={"email": "carol@example.com"},
        headers=authz(b["access_token"]),
    )
    assert r.status_code == 403, r.text
    bob_me = client.get("/api/v1/auth/me", headers=authz(b["access_token"])).json()["data"]
    r = client.delete(f"/api/v1/projects/{pid}/members/{bob_me['id']}", headers=authz(b["access_token"]))
    assert r.status_code == 403, r.text
    r = client.delete(f"/api/v1/projects/{pid}", headers=authz(b["access_token"]))
    assert r.status_code == 403, r.text
    r = client.patch(f"/api/v1/projects/{pid}", json={"name": "Hijack"}, headers=authz(b["access_token"]))
    assert r.status_code == 403, r.text


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


def test_remove_member_preserves_tasks(client):
    """Req 9: removal revokes access but keeps the member's work intact."""
    signup(client, "Alice", "alice@example.com")
    signup(client, "Bob", "bob@example.com")
    a = login(client, "alice@example.com")
    b = login(client, "bob@example.com")
    bob_me = client.get("/api/v1/auth/me", headers=authz(b["access_token"])).json()["data"]
    p = make_project(client, a["access_token"])
    pid = p["id"]
    client.post(
        f"/api/v1/projects/{pid}/members",
        json={"email": "bob@example.com", "role": "member"},
        headers=authz(a["access_token"]),
    )
    # Bob creates a task and comments on it.
    r = client.post(
        f"/api/v1/projects/{pid}/tasks", json={"title": "Bob's task"}, headers=authz(b["access_token"])
    )
    assert r.status_code == 201, r.text
    tid = r.json()["data"]["id"]
    r = client.post(
        f"/api/v1/projects/{pid}/tasks/{tid}/comments",
        json={"content": "bob was here"},
        headers=authz(b["access_token"]),
    )
    assert r.status_code == 201, r.text
    # Alice assigns a second task to Bob.
    r = client.post(
        f"/api/v1/projects/{pid}/tasks",
        json={"title": "Assigned to Bob", "assignee_id": bob_me["id"]},
        headers=authz(a["access_token"]),
    )
    assert r.status_code == 201, r.text
    tid2 = r.json()["data"]["id"]
    # Owner removes Bob.
    r = client.delete(f"/api/v1/projects/{pid}/members/{bob_me['id']}", headers=authz(a["access_token"]))
    assert r.status_code == 204, r.text
    # Bob's task survives with authorship intact.
    r = client.get(f"/api/v1/projects/{pid}/tasks/{tid}", headers=authz(a["access_token"]))
    assert r.status_code == 200, r.text
    assert r.json()["data"]["created_by"] == bob_me["id"]
    # Bob's assignment is cleared, task itself remains.
    r = client.get(f"/api/v1/projects/{pid}/tasks/{tid2}", headers=authz(a["access_token"]))
    assert r.status_code == 200, r.text
    assert r.json()["data"]["assignee_id"] is None
    # Bob's comment survives.
    r = client.get(f"/api/v1/projects/{pid}/tasks/{tid}/comments", headers=authz(a["access_token"]))
    assert r.status_code == 200, r.text
    assert any(c["content"] == "bob was here" for c in r.json()["data"])
    # Bob is gone from members and locked out everywhere.
    r = client.get(f"/api/v1/projects/{pid}", headers=authz(a["access_token"]))
    assert all(m["user_id"] != bob_me["id"] for m in r.json()["data"]["members"])
    for method, path, body in [
        ("get", f"/api/v1/projects/{pid}", None),
        ("get", f"/api/v1/projects/{pid}/tasks", None),
        ("get", f"/api/v1/projects/{pid}/tasks/{tid}/comments", None),
        ("get", f"/api/v1/projects/{pid}/activity", None),
    ]:
        r = client.request(method, path, json=body, headers=authz(b["access_token"]))
        assert r.status_code == 403, (method, path, r.text)


def test_delete_project_cascades_cleanly(client):
    """Req 9: deleting a project leaves no orphaned rows behind."""
    from app.db import session as dbsession
    from app.db.models import ActivityLog, Comment, Project, ProjectMember, Task

    signup(client, "Alice", "alice@example.com")
    signup(client, "Bob", "bob@example.com")
    a = login(client, "alice@example.com")
    b = login(client, "bob@example.com")
    p = make_project(client, a["access_token"])
    pid = p["id"]
    client.post(
        f"/api/v1/projects/{pid}/members",
        json={"email": "bob@example.com", "role": "member"},
        headers=authz(a["access_token"]),
    )
    r = client.post(
        f"/api/v1/projects/{pid}/tasks", json={"title": "Doomed"}, headers=authz(b["access_token"])
    )
    assert r.status_code == 201, r.text
    tid = r.json()["data"]["id"]
    r = client.post(
        f"/api/v1/projects/{pid}/tasks/{tid}/comments",
        json={"content": "doomed comment"},
        headers=authz(a["access_token"]),
    )
    assert r.status_code == 201, r.text
    # Owner deletes the project.
    r = client.delete(f"/api/v1/projects/{pid}", headers=authz(a["access_token"]))
    assert r.status_code == 204, r.text
    # API surface reports everything gone.
    assert client.get(f"/api/v1/projects/{pid}", headers=authz(a["access_token"])).status_code == 404
    assert client.get(f"/api/v1/projects/{pid}/tasks", headers=authz(a["access_token"])).status_code == 404
    assert client.get(f"/api/v1/projects/{pid}/activity", headers=authz(a["access_token"])).status_code == 404
    # No orphaned rows at the storage seam.
    db = dbsession.SessionLocal()
    try:
        import uuid as _uuid

        puid = _uuid.UUID(pid)
        assert db.get(Project, puid) is None
        assert db.query(ProjectMember).filter(ProjectMember.project_id == puid).count() == 0
        assert db.query(Task).filter(Task.project_id == puid).count() == 0
        assert db.query(Comment).join(Task, Comment.task_id == Task.id).filter(Task.project_id == puid).count() == 0
        assert db.query(ActivityLog).filter(ActivityLog.project_id == puid).count() == 0
    finally:
        db.close()


def test_task_combined_filters_search_sort_pagination(client):
    """Req 13+14: filters combine (AND), search is literal, sort orders hold,
    pagination is server-side (disjoint pages, correct totals)."""
    signup(client, "Alice", "alice@example.com")
    signup(client, "Bob", "bob@example.com")
    a = login(client, "alice@example.com")
    b = login(client, "bob@example.com")
    bob_id = client.get("/api/v1/auth/me", headers=authz(b["access_token"])).json()["data"]["id"]
    alice_id = a["user"]["id"]
    p = make_project(client, a["access_token"])
    pid = p["id"]
    client.post(
        f"/api/v1/projects/{pid}/members",
        json={"email": "bob@example.com", "role": "member"},
        headers=authz(a["access_token"]),
    )
    specs = [
        {"title": "Alpha launch", "status": "To Do", "priority": "High", "assignee_id": bob_id},
        {"title": "Beta launch", "status": "In Progress", "priority": "Low", "assignee_id": alice_id},
        {"title": "Gamma cleanup", "status": "Done", "priority": "Medium"},
        {"title": "100% coverage", "status": "To Do", "priority": "Low"},
        {"title": "Delta docs", "status": "To Do", "priority": "Medium"},
    ]
    for s in specs:
        r = client.post(f"/api/v1/projects/{pid}/tasks", json=s, headers=authz(a["access_token"]))
        assert r.status_code == 201, r.text
    base = f"/api/v1/projects/{pid}/tasks"

    def titles(qs):
        r = client.get(f"{base}?{qs}", headers=authz(a["access_token"]))
        assert r.status_code == 200, r.text
        return [t["title"] for t in r.json()["data"]], r.json()

    # All four filters ANDed together isolate exactly one task.
    got, _ = titles(f"status=To%20Do&priority=High&assignee_id={bob_id}&search=alpha")
    assert got == ["Alpha launch"], got
    # Assignee + priority together (req 13's explicit case).
    got, _ = titles(f"assignee_id={bob_id}&priority=High")
    assert got == ["Alpha launch"], got
    # Search is literal: "100_" must not wildcard-match "100% coverage".
    got, _ = titles("search=100_")
    assert got == [], got
    got, _ = titles("search=100%25")
    assert got == ["100% coverage"], got
    # Priority ordering both directions.
    got, _ = titles("sort=priority&order=desc&per_page=100")
    pris = [
        t["priority"]
        for t in client.get(f"{base}?sort=priority&order=desc&per_page=100", headers=authz(a["access_token"])).json()["data"]
    ]
    assert pris == ["High", "Medium", "Medium", "Low", "Low"], pris
    got, body = titles("sort=priority&order=asc&per_page=100")
    assert [t["priority"] for t in body["data"]] == ["Low", "Low", "Medium", "Medium", "High"]
    # Server-side pagination: disjoint pages, truthful totals.
    _, p1 = titles("per_page=2&page=1&sort=created_at&order=asc")
    _, p2 = titles("per_page=2&page=2&sort=created_at&order=asc")
    _, p3 = titles("per_page=2&page=3&sort=created_at&order=asc")
    assert p1["meta"]["total"] == 5
    assert p1["meta"]["total_pages"] == 3
    ids1 = [t["id"] for t in p1["data"]]
    ids2 = [t["id"] for t in p2["data"]]
    ids3 = [t["id"] for t in p3["data"]]
    assert len(ids1) == 2 and len(ids2) == 2 and len(ids3) == 1
    assert not (set(ids1) & set(ids2) & set(ids3))
    assert len(set(ids1) | set(ids2) | set(ids3)) == 5


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
