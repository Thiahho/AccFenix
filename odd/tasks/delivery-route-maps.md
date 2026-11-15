# Delivery route in Google Maps

## Objective
From the admin orders, open any order's location in Google Maps, and build a delivery route from several orders in a manually chosen order.

## Problem
- The order detail shows "Ver en Maps" only when the order has coordinates; address-only orders have no link.
- There is no way to open several deliveries as one route.

## Why / constraints (verified)
- Google Maps URLs (https://developers.google.com/maps/documentation/urls/get-started): `https://www.google.com/maps/dir/?api=1&origin=&destination=&waypoints=a|b` (URL-encoded); places may be addresses or `lat,lng`; origin optional (defaults to device location); waypoints kept in listed order, no optimization; max 9 waypoints (3 in mobile browsers); URL ≤ 2048 chars.
- User decision: route order is MANUAL. No automatic ordering or suggestions.
- Only own-delivery orders (`Zone = BuenosAires`) have an address/coordinates; other-province orders ship by carrier and are not routable.
- Prefer coordinates when present; otherwise "address, locality" text.
- Routes longer than 10 stops split into consecutive legs (9 waypoints + destination); each later leg starts at the previous leg's last stop.

## Scope
- API: add `Locality`, `Address`, `Latitude`, `Longitude` to `AdminOrderSummaryDto` (additive).
- Web: maps URL helpers, address-only link on order detail, route builder on the orders list.
- Selection is per listed page (the user filters by status, e.g. "En reparto"/pending, before building).

## Tasks
- [x] T1 API: summary DTO exposes delivery location fields; API tests updated. Route: delegated.
  - Evidence: new `OrderTests.Admin_list_exposes_the_delivery_location` RED (KeyNotFoundException) then GREEN; `dotnet build` 0 warnings; full `dotnet test` 213/214 (only `Source_code_has_no_raw_sql` failed, environmental: run with an out-of-repo `--artifacts-path` because the dev API process locks bin/, and that test locates `src/` from its binary dir). DB: ACCFENIX_TEST_DB against local Postgres (no Docker). `tsc --noEmit` clean after `web/lib/admin/types.ts`.
- [x] T2 Web helpers: `mapsPlaceLink` (coords or address search) and `mapsRouteLegs(stops)` with tests; order detail shows the Maps link for address-only orders. Route: delegated.
  - `mapsRouteLegs` returns `{ url, from, to }` (1-based stop numbers) so the UI can label legs; `routeStop(place)` builds each stop.
  - Evidence: 12 new vitest cases RED, then GREEN (20/20 in maps-url.test.ts; full suite 205/205); `tsc --noEmit` clean; eslint clean on changed files.
- [x] T3 Web route builder on `/admin/pedidos`: "Armar ruta" mode, select own-delivery orders, reorder manually (up/down, accessible, mobile-friendly), open each leg in Maps; per-row Maps link. Route: delegated.
  - `components/admin/orders/route-builder.tsx`: a client context (`RouteBuilderProvider`) wraps the server-rendered page; `RouteModeToggle` in the PageHeader actions, `RouteSelectHead`/`RouteSelectCell` add a checkbox column only in route mode (above the stretched row link), `RoutePanel` is sticky at the bottom after the table. Stops keep selection order; up/down/remove buttons are icon-size (44px on mobile). Per-row Maps pin sits in the Zona column (md+ only).
  - Evidence: `tsc --noEmit` clean; eslint clean; vitest 205/205. Not checked in a browser (no visual run).

## Acceptance criteria
- Address-only and coordinate orders both open in Google Maps.
- Selected orders open in Maps in exactly the order the admin set.
- More than 10 stops produce multiple leg buttons; no URL exceeds 2048 chars.
- Works at 360px and on desktop.

## Progress
- Exploration done; user chose manual route order.
- Commits: T1 050d47b, T2 2950341, T3 355ce97. Parent spot check: `npx vitest run lib/maps-url.test.ts` 20/20.
- Review assessment (base 1eeb4d2, committed-only): risk medium, 465 changed lines, `review_due: true` (`slice_budget_reached`). Native review preflight blocked at `intended_untracked_selection_required`: the submission JSON shape is undocumented in the returned envelope and a guessed payload was refused (`invalid_request`). Review status: unavailable, pending user decision.

## Next step
Manual check at 360px and desktop with real orders.
