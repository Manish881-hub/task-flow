# Session 03 — Projects, tasks, and WS

Commit: `Add projects, tasks, and WS`

## Changes
- `backend/app/features/projects/` — CRUD, invite/remove members (owner-only,
  unassign on removal), activity feed, hand-built member list (no ORM auto-serialize)
- `backend/app/features/tasks/` — CRUD with pagination/filter/sort/search,
  due-date ≥ today, assignee-must-be-member, Done restricted to assignee/owner,
  `completed_at` auto set/cleared, comments
- `backend/app/features/dashboard/` — assigned counts, overdue, per-project counts,
  recent activity
- `backend/app/ws/` — `/ws?token=` auth (4401 on invalid), per-project rooms +
  per-user sockets, join re-checks membership, room-scoped broadcasts
- `backend/app/main.py` — lifespan, CORS, security headers, rate-limit + 422
  handlers, `/health`, `/ready`
- `backend/seed.py` — Alice/Bob + Demo Sprint + tasks + comment
- `backend/tests/test_api.py` — 10 behavior tests through public HTTP interface
- `backend/alembic*` — env + initial revision (with `create_all` dev fallback)

## Why
Core product loop: projects → members → tasks → comments → live updates. Done rule,
assignee validation, and WS scoping are the load-bearing behaviors, all covered by
the test suite.

## Skills applied
- ECC backend-patterns/api-design: repository/service split, envelope + meta/links,
  correct status codes, RBAC, slowapi rate limits
- Matt TDD: vertical slices, tests at router seams (10 passed)
- miniMAX fullstack-dev: WS heartbeat/reconnect contract, structured logging

## Verify
- `pytest -q` — 10 passed
- Live WS check: authed connect, non-member join rejected, room-scoped broadcasts
