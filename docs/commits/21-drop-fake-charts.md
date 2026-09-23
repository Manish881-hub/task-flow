# Session 21 — Drop fake charts file

Commit: `Remove fake EfferdCharts file`

## Changes
- Deleted `frontend/components/dashboard/EfferdCharts.js` (461 lines)

## Why
Audit of the Efferd-for-TaskFlow build found this file had zero importers
(superseded by `DashboardStats`) while still carrying hardcoded e-commerce
metrics (38.4% repeat purchase, 1,842 orders). Dead code with false numbers
is the worst combination — removed, not kept "just in case". History retains
it if reference styling is ever needed.

## Verify
- No importers existed; `/dashboard` 200, dev log clean after removal
