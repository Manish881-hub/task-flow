# Session 05 — README and docs

Commit: `Update README and docs`

## Changes
- `README.md` — full production doc: skill-pack mapping, stack rationale, Docker +
  local run, data model, auth/refresh flow, WS auth + scoping, API table, design
  system, tests, limits, AI disclosure, demo checklist
- `docs/commits/README.md` — index of all 5 session notes
- `docs/commits/05-readme.md` — this session note

## Why
Docs are the deliverable for review: how to run, how auth/WS work, what was
verified, and where AI was used. Committed last so it describes the final tree.

## Verify
- `git diff --stat` — only README + docs
- `docker compose config` valid, `pytest` 10 passed, `npm run build` clean
