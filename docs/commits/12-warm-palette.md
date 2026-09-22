# Session 12 — Warm ColorHunt palette

Commit: `Apply warm ColorHunt palette`

## Changes
- `frontend/styles/globals.css` — full token swap to ColorHunt warm set:
  cream `#EFEFDD` paper, orange `#E87F24` primary (buttons/links at shade-30
  `#A25919`, 5.28:1), yellow `#FFC81E` CTA with dark ink (11.5:1),
  crimson danger scale (`#C62E4A`/`#B92C45` text-safe), muted `#526274`
  (old slate failed on cream at 4.09, now 5.38), warm borders/hovers;
  success/done moved into ember family (palette has no green, deliberate);
  `.brand-logo-img` tile rule for the TF monogram
- `docs/design/color-system.md` — rewritten: base readings, orange
  tint/shade tables, danger scale, verified text pairs, token map, rules
  (supersedes Fjord; history in git)

## Why
User-directed palette for the entire project. Every text-bearing pair
re-measured programmatically — nothing kept on eyeballing.

## Verify
- Zero stale hexes (Fjord/green/cool-gray) anywhere; `/dashboard` 200
