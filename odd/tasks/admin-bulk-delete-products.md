# admin-bulk-delete-products

Branch: `EGG-main`. Engram mirror: `odd/admin-bulk-delete-products/tasks`.

## Objective

Let the admin select several (or all) products in the `/admin/productos` grid and delete them in one action.

## Problem and why

Today products can only be deleted one by one from the product detail page. Cleaning up the catalog is slow.

## Scope

In scope: row checkboxes, "select all" checkbox for the currently listed products (respects the category filter),
a bulk delete action with confirmation, and an API endpoint that deletes several products in one request.

Out of scope: other bulk actions (hide/show, change category, prices).

## Constraints

- Reuse existing delete semantics: Cloudinary media of each product is removed; `OrderItem.VariantId` is `SET NULL`,
  so past orders keep their snapshots.
- DB deletion is all or nothing in one `SaveChanges`; unknown ids reject the whole request (404/validation), matching
  the "all or nothing" style of `PUT /products/{id}/variants/prices`.
- Bound the request size (e.g. max 500 ids, at least 1, no duplicates required to be rejected — dedupe).
- UI copy in Spanish, code in English. Confirmation dialog states how many products will be deleted.
- Test-first: xUnit integration tests in `api/tests`.

## Tasks

- [x] **T1 — Bulk delete endpoint.** `POST /api/admin/products/bulk-delete` with `{ "ids": [..] }`, returns `{ "deleted": n }`.
  Route: delegated writer (API + tests + web, 2+ non-trivial files). Checks: `cd api && dotnet test`.
- [x] **T2 — Grid selection UI.** Client component with checkboxes, select all, selected counter, delete button with
  `AlertDialog` confirmation, server action `deleteProducts(ids)`. Route: same delegated writer.
  Checks: `cd web && pnpm lint && pnpm exec tsc --noEmit` (and `pnpm test` if present).

## Progress

- Feature doc created 2026-11-13.
- T1 done — commit `6b70a56` `feat(api): add bulk product delete endpoint`. Route: delegated writer. RED observed first
  (8/8 new tests failing with 405), then GREEN. Endpoint in `AdminCatalogEndpoints.cs` (request + validator live there,
  max 500 ids, non-empty, positive, deduped). Tests: `ProductBulkDeleteTests.cs` (auth, deletes several, dedupe,
  unknown id rejects all, empty/missing/non-positive/too many rejected). Auth coverage also via the generic
  `Every_admin_route_requires_authorization`. Check: `dotnet test` → 196/196 passed (plain build; the run with
  `--artifacts-path` outside the repo fails only `Source_code_has_no_raw_sql`, which locates `src/` from the binary dir).
- T2 done — commit `41ca06e` `feat(web): select and delete several products from the admin grid`. New client component
  `web/components/admin/products-table.tsx`, server action `deleteProducts(ids)`, page keeps server fetch and remounts
  the table per category (`key`) to reset selection. Checks: `pnpm lint` exit 0, `pnpm exec tsc --noEmit` exit 0,
  `pnpm test` 111/111 passed. Not manually exercised in a browser.
