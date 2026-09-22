# task-flow
bash

cat > /home/claude/taskflow/README.md << 'EOF'
# TaskFlow

A collaborative task-board app (small Trello/Jira-style tool): create projects, invite
members, manage tasks on a board, and see teammates' changes live via WebSockets.

## Stack

- **Backend:** FastAPI (Python) + SQLAlchemy + PostgreSQL, native WebSockets
- **Frontend:** Next.js (React, pages router), plain CSS
- **Auth:** JWT access tokens + rotating refresh tokens
- **Real-time:** native WebSocket endpoint (`/ws`), not polling

**Why this stack:** FastAPI's native `WebSocket` support and dependency-injection model
made it straightforward to reuse the same membership/role checks for HTTP routes and
socket connections. Postgres was the obvious choice for the many-to-many
project/membership relationship and the amount of relational integrity the spec asks
for (cascading deletes, foreign keys, unique constraints). Next.js was chosen since it's
the path of least friction for a small React app with a handful of routes.

## Running it (clean clone)

**Requirements:** Docker and Docker Compose.

```bash
git clone <this-repo>
cd taskflow

cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

docker compose up --build
```

This starts three containers: `db` (Postgres), `backend` (FastAPI on :8000), and
`frontend` (Next.js dev server on :3000).

Once the containers are up, seed the database with two test users and a shared project:

```bash
docker compose exec backend python seed.py
```

This creates:
- `alice@example.com` / `password123` (owner of "Demo Sprint")
- `bob@example.com` / `password123` (member)
- A "Demo Sprint" project with four tasks, one assigned to Bob, one comment.

Open two browser windows (or one normal + one incognito) at `http://localhost:3000`,
log in as Alice in one and Bob in the other, and open the "Demo Sprint" project in both
to see live updates.

### Running without Docker (optional)

Backend:
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# point DATABASE_URL in .env at a Postgres instance you run yourself
uvicorn app.main:app --reload
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

## Data model

```
users
 ├─ id, name, email (unique), password_hash, created_at
 │
 ├──< refresh_tokens (1 user -> many refresh tokens, one per session/device)
 │      id, user_id, token_hash, expires_at, revoked
 │
 ├──< project_members >── projects           (many-to-many, through project_members)
 │      id, project_id, user_id, role [owner|member], joined_at
 │      unique(project_id, user_id)
 │
 └──< tasks (as assignee, as creator)

projects
 ├─ id, name, description, owner_id -> users.id, created_at
 ├──< project_members (cascade delete)
 ├──< tasks (cascade delete)
 └──< activity_log (cascade delete)

tasks
 ├─ id, project_id -> projects.id
 ├─ title, description, status [To Do|In Progress|Done], priority [Low|Medium|High]
 ├─ due_date, completed_at (set/cleared automatically on status change)
 ├─ assignee_id -> users.id (nullable, SET NULL on user removal from members)
 ├─ created_by -> users.id (nullable, kept even if the creator is removed - rule #9)
 └──< comments (cascade delete)

comments
 ├─ id, task_id -> tasks.id, user_id -> users.id, content, created_at

activity_log
 ├─ id, project_id -> projects.id, user_id -> users.id, event_type, description, created_at
```

Key relational decisions:
- **`project_members`** is the join table for the users↔projects many-to-many, and
  carries the `role` enum (`owner`/`member`) rather than having a separate "roles"
  table, since each membership has exactly one role.
- **Removing a member** deletes their `project_members` row but leaves their `tasks`
  (as creator) and `comments` intact — `created_by`/`comment.user_id` just point to a
  user no longer on the project. Any task still assigned to them gets `assignee_id`
  cleared automatically.
- **Deleting a project** cascades to `project_members`, `tasks` (which cascades to
  `comments`), and `activity_log` via SQLAlchemy's `cascade="all, delete-orphan"`, so
  there are no orphaned rows.
- IDs are UUIDs (native `UUID` column on Postgres; a small `TypeDecorator` falls back
  to `CHAR(36)` so the same models also work against SQLite for quick local testing).

## Auth: password rules, JWT, and the refresh-token flow

**Password rules** (documented, enforced in the signup schema): minimum 8 characters,
at least one letter and one digit, and at most 72 bytes (bcrypt's hard input limit).

**Passwords** are hashed with bcrypt directly (`bcrypt.hashpw`/`checkpw`) rather than
through `passlib`, which currently has a version-compatibility bug against recent
`bcrypt` releases (`passlib` calls a `bcrypt.__about__` attribute that newer `bcrypt`
versions removed). Using `bcrypt` directly sidesteps that entirely.

**Access token:** a short-lived (15 min) JWT, `Authorization: Bearer <token>` header
on every request. Kept **only in memory** in the frontend (a module-level JS variable,
never `localStorage`/`sessionStorage`), so it can't be read off disk by an XSS payload.
It's lost on a hard page refresh, which the frontend recovers from with a silent
refresh call on app start.

**Refresh token:** a long-lived (7 day), high-entropy opaque string (not a JWT) stored
in an **httpOnly, SameSite=Lax cookie** scoped to the `/auth` path, so client-side JS
can never read it — it only ever travels automatically to `/auth/*` endpoints. The
server never stores the raw token, only its SHA-256 hash, in a `refresh_tokens` table.

**Refresh flow:**
1. Frontend's fetch wrapper calls `/auth/refresh` (with credentials, so the cookie is
   sent) whenever a request comes back `401` (access token expired), then retries the
   original request once with the new access token.
2. The server looks up the incoming token's hash. If it's missing, already revoked, or
   expired → `401` (forces re-login).
3. On success, the old refresh token row is marked `revoked = true` and a brand-new
   refresh token is issued and set as the new cookie (**rotation**). This means a
   stolen, already-used refresh token cookie stops working the moment the legitimate
   client refreshes again — reuse of a revoked token is rejected outright.
4. **Logout** revokes the current refresh token server-side and clears the cookie.

## WebSocket setup

**Authentication:** browsers can't attach custom headers to a WebSocket handshake, so
the client connects to `ws://.../ws?token=<access_token>` with the same short-lived JWT
used for REST calls. The server decodes and validates it exactly like the
`Authorization` header before accepting the connection; an invalid/missing token closes
the socket immediately (code 4401).

**Scoping (the important part):** a connected socket doesn't automatically receive
anything. After connecting, the client sends `{"action": "join", "project_id": "..."}`.
The server re-checks (against the database) that the authenticated user is actually a
member of that project **before** adding the socket to that project's in-memory "room".
All project-scoped broadcasts (`task_created`, `task_updated`, `member_invited`, etc.)
are sent only to sockets in that project's room — there is no global broadcast. This is
also re-verified on every `join` message, so a user removed mid-session can't keep
listening by staying connected. Personal events (`assigned_task_updated`, sent when a
task assigned to you changes from *any* project) go through a separate per-user socket
registry, independent of room membership.

**Disconnects/reconnects:** the frontend's `useTaskFlowSocket` hook reconnects
automatically with capped exponential backoff (1s, 2s, 4s, ... up to 15s) whenever the
socket closes unexpectedly. Because all real state lives in Postgres and is fetched via
plain REST calls on page load, a dropped socket never leaves the UI stuck — a manual
refresh (or the automatic reconnect) always catches back up. The connection status is
shown in the project header ("Live" / "Reconnecting...").

## What was hard

- **Refresh-token rotation with SQLite vs Postgres timezone handling** — SQLite (used
  for local test runs) doesn't persist timezone info on `DateTime` columns the way
  Postgres does, which caused a `naive vs aware datetime` comparison crash in the
  refresh-token expiry check. Fixed by normalizing to UTC before comparing.
- **The `passlib`/`bcrypt` incompatibility** mentioned above — passlib's bcrypt backend
  probes a `bcrypt.__about__.__version__` attribute that was removed in `bcrypt` 4.1+,
  so any environment with a recent `bcrypt` installed made every password hash call
  crash. Solved by dropping passlib for password hashing and calling `bcrypt` directly.
- **Scoping WebSocket broadcasts correctly** without a message broker (this is a
  single-process app) — solved with a simple in-memory `project_id -> set[WebSocket]`
  and `user_id -> set[WebSocket]` registry, with membership re-checked at join time.

## Known issues / incomplete

- No automated test suite is checked into the repo (I ran extensive manual integration
  tests against a live server during development — see the "What was hard" and testing
  notes below — but didn't package them as a `pytest` suite given time constraints).
- No database migrations (Alembic) — tables are created with
  `Base.metadata.create_all()` on startup. Fine for this exercise, not production-ready.
- The WebSocket connection manager is in-process memory, so this won't work correctly
  if the backend is ever scaled to multiple processes/instances without adding a shared
  pub/sub layer (e.g. Redis).
- No rate limiting on auth endpoints.
- Task/comment lists aren't virtualized — fine at demo scale, would need attention for
  projects with thousands of tasks.

## What I'd improve with more time

- Alembic migrations instead of `create_all`.
- A real automated test suite (pytest + a test database) checked into CI.
- Redis-backed pub/sub for the WebSocket layer so it can scale horizontally.
- Optimistic UI updates on drag-and-drop with rollback on failure.
- Rate limiting and account lockout on repeated failed logins.

## Where AI was used

I used an AI assistant (Claude) to scaffold this project end-to-end — the data model,
FastAPI routers, WebSocket manager, and the Next.js frontend. Rather than accepting the
first pass as-is, I had it write and run actual integration tests against a live server
(HTTP and WebSocket both) as part of building this out, which caught several real bugs
along the way that I then had it fix and re-verify:
- A `passlib`/`bcrypt` version incompatibility that made every signup crash.
- A Pydantic response-model bug where the project-detail endpoint tried to
  auto-serialize the raw ORM `members` relationship instead of the hand-built member
  list, causing a validation error.
- A naive-vs-timezone-aware `datetime` comparison crash in the refresh-token expiry
  check (only surfaced when testing against SQLite).
- An initial WebSocket 404 that turned out to be caused by testing against an
  unpinned/newer FastAPI version with different routing internals than the pinned
  `requirements.txt` version — resolved by testing against the exact pinned versions.

What I learned from that process: it's easy to write code that "looks right" for
stateful, multi-actor flows like refresh-token rotation and scoped WebSocket broadcasts,
and the only way I actually trusted it was by running real clients (an HTTP session
and a WebSocket client, both scripted) against a live server and asserting on the actual
wire behavior, not just reading the code.

## Demo video checklist

(For the recording: two browser windows, sign up two users, create a project, invite
the second user, create and assign a task, move it across the board and watch it update
live in the other window, comment on it, and show the dashboard + activity feed.)
EOF
echo done
