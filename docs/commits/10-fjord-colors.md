# Session 10 — Fjord color system

Commit: `Apply Fjord color system`

## Changes
- `frontend/styles/globals.css` — primary green family replaced by Fjord Signal
  `#2596BE` scale (strong/hover/secondary/soft/faint); links, buttons, rings,
  badges, avatars, board accents remapped to AA-passing shades; success split
  into text-safe `#03800D` + graphic-only `#05FF1A` (live dot pairs it with a
  dark border); gold CTA kept (complement-adjacent); header + palette styles
- `docs/design/color-system.md` (new) — conversions, 10% tint/shade tables with
  measured WCAG ratios, harmonies, green role table, token map, usage rules

## Why
Base `#2596BE` is 3.40:1 white (fails AA body text), so roles split by measured
ratio: base for brand/icons, `#1E7898`+ for white-text buttons/links, tints for
fills. Neon green constrained to non-text use by the same measurement.

## Verify
- No stale greens (`15803d/166534/f0fdf4/bbf7d0`) anywhere; `/dashboard` 200
