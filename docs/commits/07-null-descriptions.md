# Session 07 — Null-tolerant descriptions

Commit: `Accept null descriptions`

## Changes
- `backend/app/features/projects/schemas.py` — `ProjectCreate.description` accepts
  `str | None`, normalized to `""` via validator
- `backend/app/features/tasks/schemas.py` — same for `TaskCreate.description`

## Why
Dashboard sends `description: null` for empty input; both Create schemas typed it
`str`, so every project/task created without a description failed with
422 `string_type` at `body.description`. Update schemas already accepted null —
Create was the odd one out. Normalizing to `""` keeps DB/service code unchanged.

## Verify
- Live curl: project + task with `"description": null` → 201 (were 422)
- `pytest` 10 passed
