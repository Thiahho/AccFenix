# Admin edits an order's delivery location

## Objective
Let the admin correct the delivery location of an own-delivery order (locality, address, map point) from the order detail, so the Maps link and route builder use the right place.

## Problem
Admin order endpoints only change status; a wrong or missing address/pin cannot be fixed, and the route opens the wrong place.

## Scope
- Own-delivery orders (`Zone = BuenosAires`) only: `Locality`, `Address`, optional `Latitude`/`Longitude` (set from a pasted Google Maps link or removed).
- Other-province orders (province/carrier) are out of scope.
- API: new admin endpoint to update the location, validated with the same rules as public order creation (limits, single line, locality rules, coordinate ranges, both-or-neither coordinates).
- Web: edit form on `/admin/pedidos/[id]`, reusing the public order form's Maps-link parsing (including short links if the public flow resolves them server-side).

## Constraints
- Reuse existing validation and Maps helpers; no duplicated rules.
- Mobile (360px) and desktop.
- Test-first: API tests (RED then GREEN); web helper tests if new pure logic is added.

## Tasks
- [x] T1 API: `PATCH /api/admin/orders/{id}/location` with validator and tests (404, non-own-delivery 400/409, invalid input 400, success, coordinates cleared). Route: delegated.
  - Evidence: location rules extracted to `BuenosAiresLocationValidator` (over `IBuenosAiresLocation`), included by both `CreateOrderRequestValidator` and `OrderLocationRequestValidator`. Other-province orders return 409 Conflict. Returns `AdminOrderDto`. RED: 11 new tests failing before the endpoint; GREEN: `dotnet test` 226/227 passed, the 1 failure is the environmental `SecurityTests.Source_code_has_no_raw_sql` (artifacts-path build).
- [ ] T2 Web: server action + edit form on the order detail (locality, address, Maps link to set the pin, remove pin), updating the page after save. Route: delegated.

## Acceptance criteria
- Admin can change locality/address and set or remove the map point of an own-delivery order.
- Invalid input shows field errors; other-province orders show no edit option.
- After saving, "Ver en Maps" and the route builder use the new location.

## Progress
- Scope set by parent (user asked to edit "the location field of an order").

## Next step
T1.
