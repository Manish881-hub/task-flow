# Session 17 — Activity actor names

Commit: `Include actor names in activity`

## Changes
- `backend/app/features/projects/router.py` — `project_activity` batch-fetches
  authors (one query for all rows) and includes `user_name` per item

## Why
Activity items carried only `user_id`, so every feed in the app rendered
"Someone" for every event. One batched lookup (no N+1) fixes dashboard,
project board, and assigned feeds at once; additive key, no contract break.

## Verify
- `pytest` 10 passed; live: new `task_created` event returns
  `user_name: "BrowserSim"`
