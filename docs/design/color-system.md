# TaskFlow Color System — Blue (landing-matched)

Supersedes the warm ColorHunt set per direction change. Primary **#1D70F5**
(royal blue, shared with the landing theme), soft fills, green success,
red danger. All text pairs measured programmatically (WCAG).

## Verified text pairs (all ≥ 4.5:1 AA unless noted)

| Pair | Ratio |
|---|---|
| white on `#155ECC` (buttons, links) | 5.99 |
| white on `#1D70F5` | 4.48 (hover only, large/bold) |
| `#155ECC` on soft `#EEF5FF` (active nav, avatars) | 5.46 |
| muted `#64748B` on `#F8FAFC` | 4.76 |
| slate `#475569` on `#F1F5F9` (badges, counts) | 7+ |
| success `#047857` on `#ECFDF5` (was `#059669` at 3.58 — fixed) | 5.21 |
| gold `#B45309` on `#FFFBEB` | 4.84 |
| danger `#DC2626` on white/cards (was `#EF4444` at 3.76 — fixed) | 4.83 |
| danger `#DC2626` on soft `#FEE2E2` (banner) | ~4.6 |
| live border `#047857` on white (was `#059669` at 3.77 — fixed) | 5.48 |

## Token map (`styles/globals.css`)

`--color-primary #1D70F5` (brand, large text, borders, focus glow) ·
`-strong #155ECC` (buttons, links, active states) · `-hover #1249A8` ·
`-secondary #0284C7` · `-soft #EEF5FF` / `-faint #F8FAFF` fills ·
`--color-accent` mirrors primary (CTA) · `--color-bg #F8FAFC`, card `#FFFFFF`,
`--color-muted #64748B`, `--color-border #E2E8F0` · danger `#DC2626` /
`-text #DC2626` / `-base #EF4444` / `-soft #FEE2E2` / `-border #FCA5A5` ·
success `#059669` fills/icons, `-strong #047857` text, `-soft #ECFDF5`,
`-border #A7F3D0` · `--color-ring #1D70F5`.

## Rules

1. Body text uses `-strong` variants or darker, never base blue/red/green.
2. Bright fills (`#10B981` dot) always pair with a dark border + text label.
3. Soft pill buttons + shadows are the theme idiom (flat rule retired with it).
4. `btn-accent` currently duplicates `btn-primary` — intentional for now;
   diverge them if a second CTA color is ever needed.
