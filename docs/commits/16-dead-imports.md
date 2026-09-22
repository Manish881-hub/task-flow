# Session 16 — Dead imports removal

Commit: `Remove dead JS and Python imports`

## Changes
- `frontend/lib/api.js` — removed unused `apiPut` export; `BASE_URL` and
  `unwrapEnvelope` made module-private (no external importers)
- `frontend/components/TaskModal.js` — lazy `await import()` of `apiPatch`
  converted to a static import
- Backend (pyflakes-verified, one file each): `main.py` dropped `Limiter` +
  `get_remote_address`; `db/base.py` dropped `DateTime`; `dashboard/router.py`
  dropped `user_out`; `projects/router.py` dropped `ForbiddenError`;
  `projects/schemas.py` dropped `datetime`; `tasks/router.py` dropped
  `Comment, ProjectMember`; `tests/test_api.py` dropped `User`
- Cleared `__pycache__` / `.pytest_cache` (live `taskflow.dev.db` kept)

## Why
Export-level audit: every remaining component, helper, and import has at
least one consumer. The `app = create_app()` pyflakes notice is the required
uvicorn entrypoint and stays.

## Verify
- `pyflakes` clean (save entrypoint notice); `pytest` 10 passed;
  `node --check` on touched lib; pages 200
