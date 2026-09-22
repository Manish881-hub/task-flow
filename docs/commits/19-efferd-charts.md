# Session 19 — EfferdCharts demo block

Commit: `Add EfferdCharts demo block`

## Changes
- `frontend/components/dashboard/EfferdCharts.js` (new, companion-authored) —
  self-described "presentational/demo component": inline-SVG e-commerce
  charts with HARDCODED metrics (38.4% repeat purchase, 1,842 orders).
  Only live inputs are `userName`/`projectCount`/`assignedCount` props.
  No fake-AI alert in this revision (dropped vs the deleted version).
- `frontend/styles/efferd-dashboard.css` — `ec-*` chart classes +
  `efferd-dark-main` content-area variant backing the block

## Warnings (review findings, committed as-is per explicit direction)
- Metrics are static fiction, not workspace data. Do not present screenshots
  of these numbers as product analytics.
- `btn-accent` duplicates `btn-primary` exactly (dead variant, kept).

## Verify
- Dev compiles clean; `/dashboard` 200 (a prior 500 was `.next` corruption
  from a concurrent build, not this code — cleaned and guarded)
