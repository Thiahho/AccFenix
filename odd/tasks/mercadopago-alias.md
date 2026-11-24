# Mercado Pago alias setting

## Objective
Let the admin store a Mercado Pago alias in Configuración and show it to the customer on the order thank-you page, with a copy button, so they can pay by transfer.

## Problem / why
Customers who do not use Checkout Pro have no way to know where to transfer; the thank-you page only offers sending the receipt by WhatsApp.

## Scope
- API: new setting key `MercadoPagoAlias` (key/value `Settings` table, no migration). Optional (empty allowed). Exposed in admin GET/PUT settings and in `GET /api/settings/public`.
- Web: alias field in `SettingsForm`; types and `saveSettings` action carry it; `/pedido/gracias` shows the alias with a copy button when it is set.
- The WhatsApp number is already editable (`components/admin/settings-form.tsx`); no change there.

## Constraints
- Alias validation mirrors Mercado Pago aliases: 6–20 chars, letters, digits, dots and hyphens; empty clears it.
- The public page must keep its current rendering mode.

## Tasks
- [x] T1 API setting + tests. Route: delegated writer (2+ non-trivial files across API and web).
- [x] T2 Web settings form, types, action, thank-you page + tests. Route: same delegated writer.
- [x] T3 Parent spot check and work-unit commits (caa8da8, 52e3723).

## Acceptance criteria
- Admin saves an alias; it round-trips through GET settings; invalid aliases are rejected with a Spanish message.
- Public settings return the alias; the thank-you page shows it with a working copy button, and hides the block when empty.

## Decisions
- Alias block shows on the thank-you page only while the order is not paid (not approved/refunded).
- PUT with the alias omitted keeps the stored value; "" clears it.
- `PublicSettings.mercadoPagoAlias` required; home fallback updated by the parent.

## Verification evidence
- Web: tsc clean (parent rerun after fallback fix); eslint clean; vitest 174/174 (writer).
- API: first run had 6 failures. One was caused by this feature: the new tests pushed AdminEndpointsTests past the login quota (10 per visitor per 5 min) and returned 429. Fixed in 52e3723 by giving each test login its own trusted visitor IP. After the fix: 272/277 pass.
- The other 5 failures (4 DatabaseConstraintTests and Migrations_script_contains_every_migration, missing 20261123235257_ProductGridReviews) also fail at 2141397, before this feature, so they predate it. Out of scope.
- No web component test: vitest has no DOM environment.

## Progress
All tasks done. The 5 failures that predate this feature remain open.
