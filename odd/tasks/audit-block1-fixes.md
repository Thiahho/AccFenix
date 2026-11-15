# Audit block 1 fixes

## Objective
Fix the four "fix now" findings from the 2026-11-15 system audit.

## Findings
1. JSON-LD escape is a no-op (`"<"` is `<`): stored XSS via product/category data. Introduced in `b6104ae`.
2. SKU can exceed its 120-char column (slug up to 180 + labels): product saved without variants, 500.
3. Product create/update and category update are two-step writes without a transaction.
4. SKUs collide across products (no product id in the SKU).

## Decisions
- One shared `serializeJsonLd` helper (escapes `<`, `>`, `&`, U+2028, U+2029) used by `JsonLd` and the FAQ.
- SKU = `{productId}-{slug}-{labels}`; when longer than 120, cut and append a short stable hash so it stays unique and within the column. Existing SKUs are not rewritten (order lines keep their snapshot); they change only when variants are regenerated.
- Transactions via `db.Database.BeginTransactionAsync()` around the multi-step handlers.

## Tasks
- [x] T1 JSON-LD escape helper + unit tests (RED → GREEN). Route: inline (2 small files, already understood).
- [x] T2 SKU format with product id + length cap, transactions on product POST/PUT and category PUT, regression tests. Route: delegated writer (2+ non-trivial C# files).
- [x] T3 Verification: web tests/lint/tsc; `dotnet build`; `dotnet test` (needs Docker; currently down).

## Checks
`npx vitest run`, `npx tsc --noEmit`, `npx eslint`, `dotnet build`, `dotnet test`.

## Verification evidence
- T1 (commit 16b27db): RED observed (module missing), GREEN 220/220 web tests; tsc and eslint clean.
- T2: SKU = {productId}-{slug}-{labels}, capped at Variant.SkuMaxLength (120) with an 8-hex SHA-256 suffix when cut. Transactions on product POST/PUT and category PUT; no execution strategy needed (plain UseNpgsql). No RED was recorded for the API tests: the writer wrote fix and tests together.
- dotnet build: 0 warnings, 0 errors. dotnet test (Docker up): 232/232 passed, including the new long-name and rollback integration tests.
- The raw-SQL test fails when the build output is outside the repo (audit L9); running with OutDir inside the repo passes.
- Not covered: rollback tests for product PUT and category PUT. Existing SKUs are not rewritten.

## Progress
All tasks done.
