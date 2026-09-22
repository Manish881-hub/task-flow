# Session 02 — Backend auth and models

Commit: `Add backend auth and models`

## Changes
- `backend/app/core/` — config (pydantic-settings, fail-fast), security (bcrypt
  direct, JWT HS256, SHA-256 refresh), errors (typed hierarchy + global handler),
  logging (JSON + request ID), middleware (security headers), deps (Bearer user)
- `backend/app/db/` — `GUID` TypeDecorator (native UUID on Postgres, CHAR(36) on
  SQLite), session/engine, all 7 models with cascades and constraints
- `backend/app/features/auth/` — router, service, repository, schemas (signup
  rules: min 8 chars, letter + digit, 72-byte cap; login/refresh rotation/logout/me)
- `backend/requirements.txt`, `backend/.env.example`, `backend/pytest.ini`

## Why
Auth + data layer is the foundation every other feature builds on. Signup, JWT
access (15 min), rotating opaque refresh in httpOnly cookie, and the UUID-portable
models land here; projects/tasks/WS come next.

## Skills applied
- miniMAX fullstack-dev: Iron Rules (typed config, typed errors, no business logic
  in routers, no HTTP types in services)
- ECC api-design: `/api/v1/auth/*` routes, 201/401/422 semantics, error envelope
- Matt TDD: seams fixed at HTTP routers for the later test suite

## Verify
- `pytest tests/test_api.py` auth cases pass (signup/login/refresh/logout)
- No secrets staged (only `.env.example`)
