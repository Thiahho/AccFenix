# Mobile readiness of the public site

Locator: `odd/tasks/mobile-readiness.md` · Engram mirror: `odd/mobile-readiness/tasks`

## Objective

Fix the high and medium findings of the mobile audit (2026-11-13) so ordering works reliably on 360–414 px phones
(iOS Safari, Android Chrome).

## Problem and why

- After the async save, `window.open` to `wa.me` is no longer a user gesture; iOS blocks it silently and the success
  panel claims WhatsApp was opened, so orders may never reach the distributor.
- The hero's h1 and image render at opacity 0 until motion hydrates, delaying LCP on mid-range phones.
- Several checkout and product controls overflow or are under 44 px at 360 px; the keyboard covers suggestion lists;
  the WhatsApp FAB competes with the checkout's own send button.

## Scope (authorized: audit items 1–7)

Out of scope: low findings (safe-area insets in landscape, menu focus trap, 11–12 px text, enterKeyHint, cart button
width, home animation cost, post-order scroll, admin orders list).

## Tasks

- [x] **M1 — WhatsApp handoff that survives popup blockers.** Success panel makes "Abrir WhatsApp" the primary action
  (large, focused, copy says to tap it); the panel no longer claims WhatsApp was already opened; the automatic
  `window.open` stays only as a best-effort attempt. Panel scrolled into view and focused after placing the order.
- [x] **M2 — Hero visible without JS.** h1 and hero image render visible from the server; only secondary items animate.
- [x] **M3 — Product page quantity row fits 360 px.** Stepper and "Agregar al pedido" wrap/stack below `sm`.
- [x] **M4 — Keyboard does not hide suggestions.** `interactiveWidget: "resizes-content"` on the viewport and/or
  visualViewport-aware sizing for SuggestInput and ProvinciaPicker sheet.
- [x] **M5 — No WhatsApp FAB on `/pedido`.**
- [x] **M6 — 44 px touch targets in checkout.** Review-step stepper and the "Enviar igual por WhatsApp" fallback.
- [x] **M7 — Readable review lines.** Name and presentation on up to two lines, stepper below on mobile.

## Route

Delegated direct: one writer (2+ non-trivial files; trigger: writer). Delivery strategy: `ask-on-risk`; forecast
~250 authored lines, under the 400-line budget.

## Checks

`cd web && npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. Test-first: pure logic only where it
exists; visual/layout changes are the exception. Device check on a real phone is pending (not available here).

## Progress

| Task | Status | Commit | Verification |
| --- | --- | --- | --- |
| M1 | done, not device-checked | f055bac | test 193/193, lint 0, tsc 0, build ok |
| M5 | done, not device-checked | f055bac | RED→GREEN `lib/nav.test.ts` (`showsWhatsappFab`); test 193/193, lint 0, tsc 0, build ok |
| M3 | done, not device-checked | 98a53e4 | layout exception (no runnable RED); test 193/193, lint 0, tsc 0, build ok |
| M6 | done, not device-checked | 98a53e4 | layout exception (no runnable RED); test 193/193, lint 0, tsc 0, build ok |
| M7 | done, not device-checked | 98a53e4 | layout exception (no runnable RED); test 193/193, lint 0, tsc 0, build ok |
| M2 | done, not device-checked | 7cdd8ce | visual exception (no runnable RED); test 193/193, lint 0, tsc 0, build ok |
| M4 | done, not device-checked | 36fa017 | RED→GREEN `lib/viewport.test.ts` (`keyboardInset`); test 193/193, lint 0, tsc 0, build ok |

Route per task: delegated direct (one writer). Notes: M1 keeps the automatic `window.open` as best effort; the
success panel scrolls into view (instant under reduced motion) and focuses "Abrir WhatsApp". M4 adds
`interactiveWidget: "resizes-content"` (Android) plus a visual-viewport keyboard inset that lifts the province sheet
on iOS; SuggestInput scrolls its list into view and caps it at `min(16rem, 40dvh)`.

## Next step

Device check on real phones (iOS Safari, Android Chrome, 360–414 px): WhatsApp handoff after placing an order, hero
LCP, product quantity row, review step, address suggestions and province sheet with the keyboard open.

Review assessment of 9f4a7dc..36fa017 (untracked files excluded): risk medium (`executable_change` in
`web/app/layout.tsx`), 15 paths, 271 lines, `review_due: false` (`under_budget`); stays pending in the slice. Parent
spot check: `npm test` 193/193.
