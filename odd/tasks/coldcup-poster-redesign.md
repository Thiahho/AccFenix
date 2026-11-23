# ColdCup poster redesign

## Objective

Give the public site its own poster-style design that no longer resembles Eggy, while keeping the ColdCup palette.

## Problem

The palette changed, but the structure is still Eggy: capsule header, pill labels, Montserrat uppercase titles, and rounded cards.

## Why

The user asked for a new design unlike Eggy and chose the "Poster cafe" direction on 2026-11-23. Reference: the `APERTURA 2x1` post in `docs/img/img1.png`.

## Scope

- In: public layout, header, footer, home, catalog, product detail, order, order result, and not-found surfaces.
- Out: admin appearance and layout, API, business logic, checkout behavior, product photos, footer wording, and the open decisions on unpriced products and checkout WhatsApp text.

## Design language

- Condensed, very large display type with a readable companion text face.
- Full-bleed espresso and cream color blocks.
- Straight edges, hard rules, and table-like menu rows instead of rounded cards and pills.
- Starburst stamps as the signature graphic.
- Existing palette tokens stay the source of color.

## Constraints

- No invented offers: the `2x1` in the reference must not appear as a real promotion. Stamps use true brand phrases only.
- Do not trace or recreate the ColdCup logo.
- Public styling must not change admin fonts, radius, or layout.
- WCAG AA contrast, visible focus, tap targets of at least 44px, `prefers-reduced-motion`, no horizontal scroll at 320px.
- Conventional Commits without AI attribution. No push, PR, or merge.

## Tasks

- [x] T1: Add the poster type, shape, and stamp foundations scoped to the public site. Route: delegated direct (2+ non-trivial files).
- [x] T2: Redesign header, footer, and hero. Route: delegated direct.
- [x] T3: Redesign the price board and remaining home sections. Route: delegated direct.
- [ ] T4: Apply the language to catalog, product, order, result, and not-found pages. Route: delegated direct.

## Acceptance criteria

- No capsule header, pill labels, Montserrat display titles, or rounded product cards remain on public pages.
- Purchase flow behaves as before for delivery and pickup.
- Admin renders as before.

## Checks

From `web/`: `npm run lint`, `npm test`, `npm run build`, plus browser checks at 320, 375, and 1280px.

Test-first exception: visual styling has no meaningful deterministic RED; existing tests guard behavior.

## Progress
- T1: done in a91816a. Anton and Archivo load only in the public scope; lint, tests and build passed.
- T2: done in 57adbee. Flat ruled header, full-bleed hero with headline and CTA in the first viewport at 320, 375 and 1280px; lint, tests and build passed.
- T3: done in b085300. Full-width category bands with ruled size columns, numbered steps and a ruled FAQ; lint, tests and build passed.

## Next step

Start T4.
