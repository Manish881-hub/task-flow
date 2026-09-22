# TaskFlow Color System — Fjord Signal

Primary **#2596BE** (RGB 37, 150, 190 · HSL 196°, 67%, 45%).
Accent **#05FF1A** signal green (graphic fills + live dot ONLY — 1.37:1 on white,
never body text). Ratios computed programmatically (WCAG relative luminance).

## Fjord tints (mix with white) — white-text | dark-text(#0F172A)

| % | Hex | White | Dark |
|---|---|---|---|
| 0 | #2596BE | 3.40 | 5.26 |
| 10 | #3BA0C4 | 3.00 | 5.96 |
| 20 | #51ABCB | 2.61 | 6.83 |
| 30 | #66B6D2 | 2.29 | 7.81 |
| 40 | #7CC0D8 | 2.02 | 8.83 |
| 50 | #92CADE | 1.79 | 9.97 |
| 60 | #A8D5E5 | 1.58 | 11.32 |
| 70 | #BEE0EC | 1.39 | 12.81 |
| 80 | #D3EAF2 | 1.25 | 14.30 |
| 90 | #E9F4F8 | 1.12 | 15.95 |

## Fjord shades (mix with black) — white-text ratio

| % | Hex | White |
|---|---|---|
| 0 | #2596BE | 3.40 |
| 10 | #2187AB | 4.10 |
| 20 | #1E7898 | 5.01 AA |
| 30 | #1A6985 | 6.17 AA |
| 40 | #165A72 | 7.67 AA |
| 50 | #124B5F | 9.56 AAA |
| 60 | #0F3C4C | 11.86 |

## Harmonies (same-lightness samples)

| Harmony | Hex | White | Note |
|---|---|---|---|
| Complement | #D2582D | 4.06 | burnt orange; gold CTA #D97706 lives nearby — keep it |
| Analog −30° | #2DD2AB | 1.92 | decorative only |
| Analog +30° | #2D54D2 | 6.34 | info links alt |
| Triad 1 | #D22DA7 | 4.49 | sparing highlights |
| Triad 2 | #A7D22D | 1.76 | decorative only |
| Split 1 | #D22D54 | 4.95 | danger adjacent (danger stays #DC2626) |
| Split 2 | #D2AB2D | 2.19 | decorative only |

## Signal green roles

| Hex | White | Dark | Role |
|---|---|---|---|
| #05FF1A | 1.37 | 13.03 | live dot fill (2px #03800D border carries contrast), graphic fills |
| #03800D | 5.13 | 3.48 | success text, badges, checks |
| #02660A | 7.22 | 2.47 | strong success emphasis |
| #9BFFA3 / #E6FFE8 | — | 12+ | badge/border/fill tints |

## Token map (`styles/globals.css`)

`--color-primary #2596BE` brand · `--color-primary-strong #1E7898` buttons/links ·
`--color-primary-hover #1A6985` · `--color-secondary #165A72` ·
`--color-primary-soft #D3EAF2` / `-faint #E9F4F8` fills ·
`--color-accent #D97706` CTA (complement-adjacent) · `--color-ring #1A6985` ·
`--color-success #03800D` / `-strong #02660A` / `-bright #05FF1A` / `-soft #E6FFE8` /
`-border #9BFFA3`.

## Rules

1. White body text only on shade ≥20% (#1E7898+). Base #2596BE is large-text/icons/borders only.
2. Bright green never carries meaning alone — always paired with dark border or text label.
3. Tints = backgrounds/highlights; shades = hover/ depth. Same as the green scale discipline.
