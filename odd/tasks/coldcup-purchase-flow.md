# ColdCup purchase flow

## Objective

Make ordering a coffee shorter and clearer by removing structure inherited from the wholesale egg business.

## Problem

Checkout starts by asking for a personal or business customer, the home lists every product twice, and catalog cards have no price or action.

## Why

Design audit approved by the user on 2026-11-23 (points 1 and 2 plus secondary improvements).

## Scope

- In: checkout customer step, home composition, catalog cards, active navigation state, unit pluralization, cart row layout on phones.
- Out: API and database changes, product photos, footer wording, deleting unused egg images, payment behavior.

## Constraints

- The order payload must remain valid for the current API. If the API requires a customer type, send `Personal`'s value by default.
- Every variant stays purchasable from the home price board.
- Do not weaken tests. Update a test only when it asserts behavior this feature intentionally changes, and record it.
- Conventional Commits without AI attribution. No push, PR, or merge.

## Tasks

- [x] T1: Remove the customer type step from checkout. Route: delegated direct (2+ non-trivial files).
- [ ] T2: Make the price board the single home ordering path and keep product cards on category pages. Route: delegated direct.
- [ ] T3: Add price and action to catalog cards and address the repeated description. Route: delegated direct.
- [ ] T4: Fix active navigation, `1 unidades`, and the phone cart row. Route: delegated direct.

## Acceptance criteria

- Checkout has no personal/business question and an order can still be submitted for delivery and pickup.
- Each product appears once on the home.
- Catalog cards show a price and a clear action.
- Navigation marks the current category; unit text is singular for one unit.
- No horizontal scroll at 320, 375, and 1280px.

## Checks

From `web/`: `npm run lint`, `npm test`, `npm run build`.

Test-first applies to pure logic (step sequence, payload, pluralization, active navigation). Layout-only changes use visual checks.

## Progress
- T1 done in 2b862c6. The API requires `customerType`, so the web always sends `personal`; legacy `cliente` values are stripped. The checkout form was never persisted (only the cart is). Tests changed: order, request, response, steps. lint, 146 tests and build pass; browser checks run at the end.

## Next step

Start T2.
