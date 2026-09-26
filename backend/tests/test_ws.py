"""WS behavior tests: auth, room scoping, live pushes (req 22-26).

Native WebSocket (FastAPI), no polling anywhere. Socket listeners run in
daemon threads with queue timeouts so a missing push fails the test instead
of hanging the suite.
"""
from __future__ import annotations

import os

os.environ["DATABASE_URL"] = "sqlite:///./test_taskflow_ws.db"
os.environ["JWT_SECRET"] = "test-secret-min-32-chars-1234567890"
os.environ["JWT_EXPIRES_MIN"] = "15"
os.environ["REFRESH_DAYS"] = "7"
os.environ["CORS_ORIGINS"] = "http://localhost:3000"
os.environ["ENV"] = "test"
os.environ["RATE_LIMIT_ENABLED"] = "false"

import queue
import threading
import uuid

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.db.base import Base
from app.db.session import init_engine
from app.main import create_app

app = create_app()


@pytest.fixture()
def client():
    if os.path.exists("./test_taskflow_ws.db"):
        os.remove("./test_taskflow_ws.db")
    init_engine("sqlite:///./test_taskflow_ws.db")
    from app.db.session import engine

    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    if os.path.exists("./test_taskflow_ws.db"):
        os.remove("./test_taskflow_ws.db")


def _uniq(prefix: str) -> tuple[str, str]:
    """Unique name/email per call: immune to DB files left by killed runs."""
    tag = uuid.uuid4().hex[:8]
    return f"{prefix}{tag}", f"{prefix}{tag}@example.com"


def signup(client: TestClient, name, email, pw="password123"):
    r = client.post("/api/v1/auth/signup", json={"name": name, "email": email, "password": pw})
    assert r.status_code == 201, r.text
    return r.json()["data"]


def login(client: TestClient, email, pw="password123"):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": pw})
    assert r.status_code == 200, r.text
    return r.json()["data"]


def authz(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def me_id(client: TestClient, token: str) -> str:
    return client.get("/api/v1/auth/me", headers=authz(token)).json()["data"]["id"]


def _listen(client: TestClient, token: str, project_id: str | None, q: queue.Queue, stop: threading.Event, box: dict):
    """Hold one socket; forward every message to q. Daemon thread: dies with the suite.

    box["ws"] exposes the connection so the main thread can close it during
    teardown — otherwise the server handler never finishes and the TestClient
    portal hangs on exit.
    """
    try:
        with client.websocket_connect(f"/ws?token={token}") as ws:
            box["ws"] = ws
            if project_id is not None:
                ws.send_json({"action": "join", "project_id": project_id})
            while not stop.is_set():
                try:
                    q.put(ws.receive_json())
                except Exception:
                    break
    except Exception as exc:  # handshake rejection lands here
        q.put({"type": "__conn_error__", "detail": str(exc)})
    finally:
        box.pop("ws", None)


def _close_all(*boxes: dict):
    for box in boxes:
        ws = box.pop("ws", None)
        if ws is not None:
            try:
                ws.close()
            except Exception:
                pass


def _next(q: queue.Queue, timeout: int = 10):
    try:
        return q.get(timeout=timeout)
    except queue.Empty:
        raise AssertionError("timed out waiting for a socket message")


def _none(q: queue.Queue, timeout: int = 3):
    try:
        msg = q.get(timeout=timeout)
    except queue.Empty:
        return
    raise AssertionError(f"unexpected socket message (leak across rooms?): {msg!r}")


def test_ws_rejects_anonymous_and_bad_token(client):
    with pytest.raises(WebSocketDisconnect) as e1:
        with client.websocket_connect("/ws"):
            pass
    assert e1.value.code == 4401
    with pytest.raises(WebSocketDisconnect) as e2:
        with client.websocket_connect("/ws?token=garbage"):
            pass
    assert e2.value.code == 4401


def test_ws_join_ok_member_error_nonmember(client):
    an, ae = _uniq("Alice")
    cn, ce = _uniq("Carol")
    signup(client, an, ae)
    signup(client, cn, ce)
    a = login(client, ae)
    c = login(client, ce)
    p = client.post("/api/v1/projects", json={"name": "P"}, headers=authz(a["access_token"])).json()["data"]

    stop = threading.Event()
    qa, qc = queue.Queue(), queue.Queue()
    boxa: dict = {}
    boxc: dict = {}
    ta = threading.Thread(target=_listen, args=(client, a["access_token"], p["id"], qa, stop, boxa), daemon=True)
    tc = threading.Thread(target=_listen, args=(client, c["access_token"], p["id"], qc, stop, boxc), daemon=True)
    ta.start()
    tc.start()
    try:
        joined = _next(qa)
        assert joined["type"] == "joined" and joined["project_id"] == p["id"], joined
        err = _next(qc)
        assert err["type"] == "error", err
    finally:
        stop.set()
        _close_all(boxa, boxc)
        ta.join(timeout=10)
        tc.join(timeout=10)


def test_ws_room_isolation_and_assigned_push(client):
    """Req 23-25: room events reach members only; assignment pushes the assignee."""
    an, ae = _uniq("Alice")
    bn, be = _uniq("Bob")
    cn, ce = _uniq("Carol")
    signup(client, an, ae)
    signup(client, bn, be)
    signup(client, cn, ce)
    a = login(client, ae)
    b = login(client, be)
    c = login(client, ce)
    bob_id = me_id(client, b["access_token"])
    p = client.post("/api/v1/projects", json={"name": "P"}, headers=authz(a["access_token"])).json()["data"]
    r = client.post(
        f"/api/v1/projects/{p['id']}/members",
        json={"email": be, "role": "member"},
        headers=authz(a["access_token"]),
    )
    assert r.status_code == 201, r.text

    stop = threading.Event()
    qb, qc = queue.Queue(), queue.Queue()
    # Bob joins the room; Carol connects but never joins (outsider).
    boxb: dict = {}
    boxc: dict = {}
    tb = threading.Thread(target=_listen, args=(client, b["access_token"], p["id"], qb, stop, boxb), daemon=True)
    tc = threading.Thread(target=_listen, args=(client, c["access_token"], None, qc, stop, boxc), daemon=True)
    tb.start()
    tc.start()
    try:
        assert _next(qb)["type"] == "joined"
        # Alice creates a task assigned to Bob over plain HTTP.
        r = client.post(
            f"/api/v1/projects/{p['id']}/tasks",
            json={"title": "Live job", "assignee_id": bob_id},
            headers=authz(a["access_token"]),
        )
        assert r.status_code == 201, r.text
        types = {_next(qb)["type"], _next(qb)["type"]}
        assert "task_created" in types, types  # room broadcast
        assert "assigned_task_updated" in types, types  # personal push (req 24)
        # Carol hears nothing: no room membership, no assignment.
        _none(qc)
    finally:
        stop.set()
        _close_all(boxb, boxc)
        tb.join(timeout=10)
        tc.join(timeout=10)


def test_ws_invite_reaches_new_member_and_list_updates(client):
    """Invite UX gap: a user who never joined the room still learns about the
    invite personally; refetch then shows the project. Outsiders hear nothing.
    Removal prunes the list again."""
    an, ae = _uniq("Alice")
    bn, be = _uniq("Bob")
    cn, ce = _uniq("Carol")
    signup(client, an, ae)
    signup(client, bn, be)
    signup(client, cn, ce)
    a = login(client, ae)
    b = login(client, be)
    c = login(client, ce)
    bob_id = me_id(client, b["access_token"])
    p = client.post("/api/v1/projects", json={"name": "P"}, headers=authz(a["access_token"])).json()["data"]

    stop = threading.Event()
    qb, qc = queue.Queue(), queue.Queue()
    boxb: dict = {}
    boxc: dict = {}
    # Bob connects but CANNOT join: his client does not know the project yet.
    tb = threading.Thread(target=_listen, args=(client, b["access_token"], None, qb, stop, boxb), daemon=True)
    tc = threading.Thread(target=_listen, args=(client, c["access_token"], None, qc, stop, boxc), daemon=True)
    tb.start()
    tc.start()
    try:
        # A. owner invites Bob → Bob gets a personal invite event (no room).
        r = client.post(
            f"/api/v1/projects/{p['id']}/members",
            json={"email": be, "role": "member"},
            headers=authz(a["access_token"]),
        )
        assert r.status_code == 201, r.text
        msg = _next(qb)
        assert msg["type"] == "member_invited", msg
        assert msg["project_id"] == p["id"] and msg["user_id"] == bob_id, msg
        # B. refetch (what the sidebar does on the event) now lists it.
        r = client.get("/api/v1/projects?per_page=100", headers=authz(b["access_token"]))
        assert r.status_code == 200, r.text
        assert p["id"] in {pr["id"] for pr in r.json()["data"]}
        # C. unrelated Carol hears nothing.
        _none(qc)
        # D. removal: Bob is told personally, then the project is gone for him.
        r = client.delete(f"/api/v1/projects/{p['id']}/members/{bob_id}", headers=authz(a["access_token"]))
        assert r.status_code == 204, r.text
        msg = _next(qb)
        assert msg["type"] == "member_removed", msg
        r = client.get("/api/v1/projects?per_page=100", headers=authz(b["access_token"]))
        assert p["id"] not in {pr["id"] for pr in r.json()["data"]}
        r = client.get(f"/api/v1/projects/{p['id']}", headers=authz(b["access_token"]))
        assert r.status_code == 403, r.text
    finally:
        stop.set()
        _close_all(boxb, boxc)
        tb.join(timeout=10)
        tc.join(timeout=10)


def test_ws_project_created_reaches_creator_only(client):
    """Owner-create UX gap: the creator never joins the new room, so the
    room broadcast reaches nobody; the personal project_created push is the
    only live path to the creator's sidebar. Invite/remove flow included
    so A-E are proven in one connected session. Outsiders hear nothing."""
    an, ae = _uniq("Alice")
    bn, be = _uniq("Bob")
    cn, ce = _uniq("Carol")
    signup(client, an, ae)
    signup(client, bn, be)
    signup(client, cn, ce)
    a = login(client, ae)
    b = login(client, be)
    c = login(client, ce)
    bob_id = me_id(client, b["access_token"])

    stop = threading.Event()
    qa, qb, qc = queue.Queue(), queue.Queue(), queue.Queue()
    boxa: dict = {}
    boxb: dict = {}
    boxc: dict = {}
    # Nobody can join: the project does not exist yet.
    ta = threading.Thread(target=_listen, args=(client, a["access_token"], None, qa, stop, boxa), daemon=True)
    tb = threading.Thread(target=_listen, args=(client, b["access_token"], None, qb, stop, boxb), daemon=True)
    tc = threading.Thread(target=_listen, args=(client, c["access_token"], None, qc, stop, boxc), daemon=True)
    ta.start()
    tb.start()
    tc.start()
    try:
        # E. owner creates → only the creator gets project_created.
        r = client.post("/api/v1/projects", json={"name": "P"}, headers=authz(a["access_token"]))
        assert r.status_code == 201, r.text
        p = r.json()["data"]
        msg = _next(qa)
        assert msg["type"] == "project_created", msg
        assert msg["project_id"] == p["id"], msg
        r = client.get("/api/v1/projects?per_page=100", headers=authz(a["access_token"]))
        assert p["id"] in {pr["id"] for pr in r.json()["data"]}
        _none(qb)
        _none(qc)
        # A. owner invites Bob → Bob gets a personal invite event (no room).
        r = client.post(
            f"/api/v1/projects/{p['id']}/members",
            json={"email": be, "role": "member"},
            headers=authz(a["access_token"]),
        )
        assert r.status_code == 201, r.text
        msg = _next(qb)
        assert msg["type"] == "member_invited", msg
        assert msg["project_id"] == p["id"] and msg["user_id"] == bob_id, msg
        # B. refetch (what the real EfferdSidebar does on the event) lists it.
        r = client.get("/api/v1/projects?per_page=100", headers=authz(b["access_token"]))
        assert p["id"] in {pr["id"] for pr in r.json()["data"]}
        # C. creator gets no personal invite echo; outsider hears nothing.
        _none(qa)
        _none(qc)
        # D. removal: Bob is told personally, then the project is gone for him.
        r = client.delete(f"/api/v1/projects/{p['id']}/members/{bob_id}", headers=authz(a["access_token"]))
        assert r.status_code == 204, r.text
        msg = _next(qb)
        assert msg["type"] == "member_removed", msg
        r = client.get("/api/v1/projects?per_page=100", headers=authz(b["access_token"]))
        assert p["id"] not in {pr["id"] for pr in r.json()["data"]}
        r = client.get(f"/api/v1/projects/{p['id']}", headers=authz(b["access_token"]))
        assert r.status_code == 403, r.text
    finally:
        stop.set()
        _close_all(boxa, boxb, boxc)
        ta.join(timeout=10)
        tb.join(timeout=10)
        tc.join(timeout=10)


def test_ws_removed_member_stops_hearing_room(client):
    """Req 25: eviction on removal is immediate, not eventual."""
    an, ae = _uniq("Alice")
    bn, be = _uniq("Bob")
    signup(client, an, ae)
    signup(client, bn, be)
    a = login(client, ae)
    b = login(client, be)
    bob_id = me_id(client, b["access_token"])
    p = client.post("/api/v1/projects", json={"name": "P"}, headers=authz(a["access_token"])).json()["data"]
    client.post(
        f"/api/v1/projects/{p['id']}/members",
        json={"email": be, "role": "member"},
        headers=authz(a["access_token"]),
    )
    stop = threading.Event()
    qb = queue.Queue()
    boxb: dict = {}
    tb = threading.Thread(target=_listen, args=(client, b["access_token"], p["id"], qb, stop, boxb), daemon=True)
    tb.start()
    try:
        assert _next(qb)["type"] == "joined"
        r = client.delete(f"/api/v1/projects/{p['id']}/members/{bob_id}", headers=authz(a["access_token"]))
        assert r.status_code == 204, r.text
        # Bob gets his personal removal notice...
        msg = _next(qb)
        assert msg["type"] == "member_removed", msg
        # ...then silence: the next board event must NOT reach him.
        client.post(f"/api/v1/projects/{p['id']}/tasks", json={"title": "After"}, headers=authz(a["access_token"])).json()
        _none(qb)
    finally:
        stop.set()
        _close_all(boxb)
        tb.join(timeout=10)
