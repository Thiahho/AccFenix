# egg-wholesale-ordering

Branch: `EGG-main` (product branch off `main` at `2694756`). Engram mirror: `odd/egg-wholesale-ordering/tasks`.

## Objective

Turn the AccFenix catalog (no prices, WhatsApp-only orders) into an ordering tool that can be pitched to an egg
distributor who sells wholesale and retail and delivers with their own truck.

## Problem and why

The current system only covers a price-less catalog. An egg seller has a tiny catalog; the value is in prices
(retail vs wholesale), orders that are stored and tracked, and delivery. The client has not been interviewed yet,
so this feature builds only what is needed regardless of how they work today: prices and persisted orders.

## Scope

In scope: variant prices (retail and wholesale), price display and totals in the public site and WhatsApp message,
persisted orders with statuses, admin order management.

Out of scope (backlog, needs the client conversation first): egg seed data and home page rebranding, customers and
recurring orders, daily route sheet, customer account balance, stock and returnable packaging.

## Constraints

- Existing behavior stays valid: a variant without a price keeps working as "price on request".
- Wholesale keeps its current meaning: total cart units >= `WholesaleThreshold` setting.
- Prices are ARS, stored as `numeric(12,2)`. The server is the source of truth for order totals; never trust client prices.
- Public order creation is unauthenticated: validate strictly and rate limit it, following the existing login rate-limit pattern.
- Code, identifiers, comments and tests in English where new; user-facing UI copy follows the existing site language (Spanish).
- Test-first where a runnable deterministic test exists (xUnit integration tests in `api/tests`, vitest in `web`).

## Tasks

- [x] **T1 — Variant prices in the API.** `RetailPrice` and `WholesalePrice` (nullable decimals) on `Variant`, EF migration,
  admin endpoints to read and update them (single and bulk per product), exposed in the public product DTOs, validation
  (non-negative, max 2 decimals, upper bound). Route: delegated writer (2+ non-trivial files).
  Checks: `cd api && dotnet test`.
- [x] **T2 — Prices in the web.** Admin variants grid edits both prices; public variant picker and product page show the
  price; cart and order view show line subtotals and total, switching to wholesale prices when the cart is wholesale;
  WhatsApp message includes unit prices and total; variants without price show "Consultar". Route: delegated writer.
  Checks: `cd web && npm test`, `npm run lint`, `npx tsc --noEmit`.
- [x] **T3 — Persisted orders in the API.** `Order` and `OrderItem` entities with a server-side price snapshot, public
  `POST /api/orders` (validated, rate limited), admin list, detail and status update
  (`Pending`, `Confirmed`, `OutForDelivery`, `Delivered`, `Cancelled`), migration. Route: delegated writer.
  Checks: `cd api && dotnet test`.
- [ ] **T4 — Orders in the web.** The order form stores the order through the API before opening WhatsApp and includes the
  order number in the message; admin "Pedidos" page with list, detail and status changes. Route: delegated writer.
  Checks: `cd web && npm test`, `npm run lint`, `npx tsc --noEmit`.

- [x] **T5 — Database constraints and SQL script.** Done in `d009fb6`: 13 `CK_` constraints, RED 29 failed / 2 passed,
  GREEN `dotnet test` 180 passed (writer); script applied twice to a throwaway Postgres 16 with no errors (writer);
  parent checked the commit and the 13 constraint names in the script. Not enforced in DB: non-blank zone fields, province list. CHECK constraints for prices, quantities, statuses and zones
  (migration `AddOrderCheckConstraints`) plus an idempotent script of all migrations at `api/db/migrations.sql`
  for manual production apply (migrations only run via `seed`). Requested by the user on 2026-11-13.
  Route: delegated writer. Checks: `cd api && dotnet test`.

- [x] **T6 — `reset-admin` CLI command.** Done in `20a48e9`: RED CS0103 (types missing), GREEN `dotnet test` 188 passed
  (writer, run with an in-repo `--artifacts-path` because the running API locked `bin`); parent checked the commit and
  `Program.cs` wiring. Min password length 8 (no prior rule existed). `dotnet run -- reset-admin` creates the admin from `Admin:Email`/`Admin:Password`
  or resets its password, without touching catalog or settings (the seed still carries the curtain catalog). No HTTP
  endpoint. Requested by the user on 2026-11-13 after losing the admin password. Route: delegated writer.
  Checks: `cd api && dotnet test`.

## Acceptance criteria

- An admin can set retail and wholesale prices per variant, and the public site shows them.
- A cart below the threshold totals with retail prices; at or above it, with wholesale prices.
- Submitting an order stores it with the prices in force at that moment and it appears in the admin panel.
- An admin can move an order through its statuses.
- All existing and new tests pass.

## Delivery

Forecast: about 1,600 authored changed lines across four work units, one or more commits per task on `EGG-main`.
No pull request is planned: `EGG-main` is a long-lived product branch. A slicing strategy will be chosen only if a
pull request is requested.

## Progress

Last reviewed boundary: `2694756` (branch point).

| Task | Status | Commit | Verification | Review tier / outcome |
| --- | --- | --- | --- | --- |
| T1 | done | `dd8f3d3` | RED 11 failed / 101 passed; GREEN `dotnet test` 111 passed, 0 failed (writer and parent spot check) | medium (`slice_budget_reached`); native review unavailable: preflight STATUS requires an intended-untracked selection that could not be supplied, so the RDD-off tier applied (writer self-verification + parent spot check) |
| T2 | done | `a8e28cb` | RED 6 failed + `pricing.test.ts` not loading; GREEN `npm test` 83 passed (writer and parent spot check); lint clean, `tsc --noEmit` exit 0, `npm run build` exit 0 (writer). Components not exercised in a browser | medium (`slice_budget_reached`); native review unavailable for the same untracked-selection reason as T1; RDD-off tier applied |
| T3 | done | `57f2929` | RED 37 failed / 1 passed of 38; GREEN `dotnet test` 149 passed, 0 failed (writer and parent spot check) | medium (`slice_budget_reached`); native review unavailable for the same untracked-selection reason; RDD-off tier applied |
| T4 | done | `ca2ff1f` | RED 3 failed / 83 passed + 4 files not loading; GREEN `npm test` 111 passed (writer and parent spot check); lint clean, `tsc --noEmit` exit 0, `npm run build` exit 0 (writer). Not exercised in a browser or against a running API | not assessed (RDD-off path as in T1–T3); parent read `web/app/actions/orders.ts`: trusted key stays server-side, only ids and quantities sent |

## Notes from T4

- Fallback: on 429 or unavailable (network, timeout, 5xx) the form offers "Enviar igual por WhatsApp" (message without order number, cart kept). No fallback after 400.
- WhatsApp opens with `window.open` after an async save; iOS Safari may block it as a popup. The success panel has an "Abrir WhatsApp" link as backup.
- Status update action lives in `web/app/admin/(panel)/pedidos/actions.ts`.
- Open: mobile footer `colSpan` on the order detail table spans hidden columns (cosmetic); admin still lands on `/admin/productos` after login.

## API contract delivered by T1

- `GET /api/admin/products/{id}` and `GET /api/products/{slug}`: each `variants[]` item has `retailPrice` and `wholesalePrice` (number or null).
- `GET /api/variants?ids=`: each item also has both prices (lets the cart refresh prices).
- `PATCH /api/admin/variants/{id}`: optional `retailPrice`, `wholesalePrice`; omitted = unchanged, explicit null = cleared.
- `PUT /api/admin/products/{id}/variants/prices`: body `{"prices":[{"variantId","retailPrice","wholesalePrice"}]}`, all or nothing, returns `{"updated": n}`.
- Price rule: null, or 0 to 99,999,999.99 with at most 2 decimals.

## Notes

- The test `Public_payloads_never_mention_prices` became `Catalog_listings_do_not_mention_prices`; the product detail payload now exposes prices by design.
- API integration tests need the Docker daemon running (Testcontainers); the native Postgres on port 5433 rejects the compose credentials.

- T2 added `web/lib/pricing.ts` (`cartTotals`, `unitPrice`, `lineSubtotal`, `formatArs`, `parsePriceInput`, `isWholesale`). Cart prices are
  refreshed from `GET /api/variants?ids=` when `/pedido` opens.

## Open items from T2 (not fixed)

- `web/components/home/barral-card.tsx` shows no price and adds items without prices; they are priced once `/pedido` refreshes.
- Home, hero and FAQ copy still says the site has no prices; it belongs to the rebranding backlog item.
- Toggling a variant's availability in the admin remounts the grid and discards unsaved price drafts.
- A cart with no priced line shows "Consultar" per line and no total box.

## API contract delivered by T3

Enum strings: status `pending | confirmed | outForDelivery | delivered | cancelled`; zone `buenosAires | otherProvince`.

- `POST /api/orders` (public, 10 requests per 10 minutes per visitor, 429 when limited).
  Request: `zone`, `customerName` (max 120), `phone` (40), `comments?` (500), `items: [{variantId, quantity}]`;
  `buenosAires` adds `locality` (120), `address` (200), optional `latitude` + `longitude` (both or neither);
  `otherProvince` adds `province` (exact name from `web/lib/provincias.ts`) and `carrier` (200).
  Fields of the other zone must be absent or null (an empty string is rejected). Prices sent by the client are ignored.
  201: `{id, number, status, createdAt, isWholesale, total, hasUnpricedItems, items: [{id, variantId, productName, sku, variantLabel, quantity, unitPrice, subtotal}]}`.
- `GET /api/admin/orders?page=1&pageSize=20&status=pending` (`pageSize` 1–100):
  `{total, page, pageSize, items: [{id, number, createdAt, status, customerName, phone, zone, isWholesale, total, hasUnpricedItems, itemCount, totalUnits}]}`.
- `GET /api/admin/orders/{id}`: summary fields (without `itemCount`, `totalUnits`) plus `locality, address, latitude, longitude, province, carrier, comments, items[]`; 404 if unknown.
- `PATCH /api/admin/orders/{id}/status` with `{status}`: `{id, number, status}`; 404 if unknown, 400 if invalid.
- Validation errors: 400 problem details with `errors: {field: [messages]}`; validator keys are PascalCase paths (`Phone`, `Items[0].Quantity`),
  server-side checks use `items`. Malformed JSON or an unknown enum string gives a 400 without `errors`.
- The web must post orders from the server with `X-Client-Ip` and `X-Trusted-Web-Key`, as login does; otherwise all visitors share one quota.

## Open items from T3 (not fixed)

- Order numbers start at 1 and can have gaps if an insert fails.
- An order total above 9,999,999,999.99 is rejected with 400 (added by the writer; does not fit `numeric(12,2)`).
- The test product helper is duplicated between `VariantPriceTests` and `OrderTests`.

## Next step

All planned tasks done. Next: browser test of the full flow with the API running (P1), including the WhatsApp popup on mobile.
