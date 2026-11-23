# ColdCup visual identity

## Objective

Apply the ColdCup coffee palette across the whole web app and the menu-card visual language on the public site.

## Problem

The web still uses the Eggy theme (egg red, yolk, charcoal) and egg-oriented visuals.

## Why

The user selected `docs/img/img1.png` (Instagram feed) and `docs/img/img2.png` (printed menu) as the design reference.

## Scope

- In: theme tokens, public pages and components, palette consistency in admin.
- Out: business logic, API, data fetching, checkout behavior, and admin layout or density.

## Design reference

Palette (estimated from screenshots):

| Token | Color | Use |
|---|---|---|
| Espresso | `#4A2C1D` | Text, primary buttons, headers |
| Caramel | `#A67C5B` | Accent, secondary headers |
| Latte | `#D9C2A5` | Borders, highlighted surfaces |
| Cream | `#F3EADB` | Cards and sections |
| Ivory | `#FAF5EA` | Page background |

Public site language: pill section headers with a circular icon, thin-border cards, dashed row separators, small/large price columns, script accent phrases, organic coffee-stain corners, heavy display titles.

## Constraints

- Text and interactive states meet WCAG AA contrast.
- Mobile-first, no horizontal scroll, respect `prefers-reduced-motion`.
- Colors come from theme tokens; hex stays only where a token cannot apply (for example OG image rendering or third-party brand colors such as WhatsApp).
- Conventional Commits without AI attribution. No push, PR, or merge.

## Final palette and contrast

Computed with the WCAG 2.x relative-luminance formula. Reference shades are unchanged; `caramel-deep`, `oat`, `roast` and the muted foreground were added because caramel alone fails AA for text.

| Token | Hex | OKLCH |
|---|---|---|
| `espresso` | `#4A2C1D` | `0.327 0.051 47` |
| `roast` | `#2E1B12` | `0.245 0.034 46` |
| `caramel` (decorative only) | `#A67C5B` | `0.62 0.07 59.2` |
| `caramel-deep` | `#7D5539` | `0.486 0.067 55.4` |
| `latte` | `#D9C2A5` | `0.826 0.047 73.5` |
| `oat` | `#EADCC6` | `0.9 0.033 79.3` |
| `cream` | `#F3EADB` | `0.94 0.022 80.7` |
| `ivory` | `#FAF5EA` | `0.971 0.015 86.4` |
| `muted-foreground` | `#6B4F3E` | `0.453 0.046 52.5` |
| `destructive` | `#A3281C` | `0.473 0.161 29.8` |

| Pair | Ratio |
|---|---|
| espresso on ivory / cream / oat | 11.57 / 10.55 / 9.32 |
| ivory on espresso (primary button) | 11.57 |
| latte on espresso | 7.32 |
| muted on ivory / cream / oat | 6.87 / 6.26 / 5.53 |
| caramel-deep on ivory / cream | 5.98 / 5.45 |
| ivory on caramel-deep (pill, active button) | 5.98 |
| destructive on ivory / cream | 6.71 / 6.12 |
| caramel on ivory (decoration only, fails text AA) | 3.42 |

## Tasks

- [x] T1: Replace theme tokens with the ColdCup palette and rename legacy tokens. Route: delegated direct (2+ non-trivial files).
- [ ] T2: Build the menu-card language in the public catalog and home. Route: delegated direct.
- [ ] T3: Apply it to checkout, result, not-found, header and footer surfaces. Route: delegated direct.
- [ ] T4: Remove remaining egg visuals where a static replacement is possible and report the rest. Route: delegated direct.

## Acceptance criteria

- No legacy color tokens remain in `web/`.
- Public pages follow the design reference at phone and desktop widths.
- Admin uses the palette with its layout unchanged.

## Checks

From `web/`: `npm run lint`, `npm test`, `npm run build`.

Test-first exception: visual styling has no meaningful deterministic RED; existing tests guard behavior.

## Progress

- Baseline before T1: lint clean, 157/157 tests, build OK.
- T1 done: tokens renamed, palette applied. Checks: lint clean, 157/157 tests, build OK.

## Next step

Start T2.
