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
- [ ] T1 JSON-LD escape helper + unit tests (RED → GREEN). Route: inline (2 small files, already understood).
- [ ] T2 SKU format with product id + length cap, transactions on product POST/PUT and category PUT, regression tests. Route: delegated writer (2+ non-trivial C# files).
- [ ] T3 Verification: web tests/lint/tsc; `dotnet build`; `dotnet test` (needs Docker; currently down).

## Checks
`npx vitest run`, `npx tsc --noEmit`, `npx eslint`, `dotnet build`, `dotnet test`.

## Progress
Created. Docker is down: API integration tests pending until it is available.
