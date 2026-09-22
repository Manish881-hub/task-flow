# TaskFlow Color System — Warm Set (ColorHunt)

Supersedes the Fjord Signal system. Palette: **#E87F24** orange primary,
**#FFC81E** yellow CTA (dark text ONLY, 11.5:1), **#EFEFDD** cream paper,
**#F73A5C** crimson danger. All ratios measured programmatically (WCAG).

## Base readings (white / dark #0F172A / cream)

| Hex | White | Dark | Cream | Role |
|---|---|---|---|---|
| #E87F24 | 2.80 | 6.37 | 2.41 | brand, large text, icons, borders — NOT body text |
| #FFC81E | 1.55 | 11.50 | 1.33 | CTA fills with dark text only |
| #EFEFDD | 1.16 | 15.35 | 1.00 | page background |
| #F73A5C | 3.67 | 4.86 | 3.16 | fills, large text, borders — NOT body text |

## Orange shades (white text) / tints (dark text)

| Shade | Hex | White | Tint | Hex | Dark |
|---|---|---|---|---|---|
| 10% | #D17220 | 3.42 | 70% | #F8D9BD | 13.31 |
| 20% | #BA661D | 4.19 | 80% | #FAE5D3 | 14.63 |
| 30% | #A25919 | 5.28 AA | 90% | #FDF2E9 | 16.20 |
| 40% | #8B4C16 | 6.68 AA | | | |

## Danger scale

| Hex | White | On soft #FEE1E7 | Role |
|---|---|---|---|
| #F73A5C | 3.67 | — | fills, borders, large text |
| #C62E4A | 5.40 AA | — | buttons, body text on white |
| #B92C45 | — | 4.88 AA | text on soft fills |

## Verified text pairs in use

muted #526274/cream 5.38 · secondary #8B4C16/cream 5.75 · ring #A25919/cream
4.54 · done #8B4C16/soft 5.48 · gold border #A68214/white 3.61 (UI) ·
danger text #B92C45/soft 4.88.

## Token map (`styles/globals.css`)

`--color-primary #E87F24` · `-strong #A25919` (buttons/links) ·
`-hover/-secondary #8B4C16` · `-soft #FAE5D3` / `-faint #FDF2E9` fills ·
`--color-accent #FFC81E` + `-ink #0F172A` + `-hover #E6B41B` ·
`--color-bg #EFEFDD`, card `#FFFFFF`, `--color-muted #526274`,
`--color-border #E4DDC4` · `--color-danger #C62E4A` / `-base #F73A5C` /
`-text #B92C45` / `-soft #FEE1E7` / `-border #FCB0BE` · `--color-ring #A25919` ·
success/done in ember (`--color-success*` = orange family, no green).

## Rules

1. White body text only on orange shade ≥30% / crimson shade ≥20%.
2. Yellow never carries white text; always pairs with dark ink.
3. Done/success live in the ember family — palette has no green by decision;
   restore a green only if status semantics prove unreadable in testing.
4. Tints = fills, shades = hover/depth, same discipline as before.
