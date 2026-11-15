# Audit block 3 fixes

## Objective
Close the backlog findings of the 2026-11-15 system audit that need no product decision or new assets.

## Scope
### Slice A — API (delegated writer, runs first)
- S5: JWT lifetime 12 h → 4 h; `SecurityStamp` on the admin user checked in `OnTokenValidated`, rotated on password reset.
- S6: per-account login failure backoff in addition to the per-IP limiter.
- S7: Cloudinary upload signature also signs `allowed_formats` and `max_file_size`.
- S8/B3: delete DB rows first, then Cloudinary (try/catch + log), single and bulk delete.
- S9: `/api/variants` returns null prices for variants that are not publicly visible.
- B4: `PATCH /variants/{id}` returns the real `ValueIds`.
- B5: remove orphan `ProductAllowedValue` rows when category attributes change.
- M5/M6: money/limit constants and the wholesale threshold default in one domain place.
- L2: DB health check on a readiness path. L3: request logging + order-created log (no PII).
- L5: test for pending model changes. L9: raw-SQL test finds the repo root by walking up to `AccFenix.sln`.

### Slice B — web (delegated writer, after A)
- S3: per-IP rate limit for `/api/geo/*`. S10: validate ids in admin server actions.
- W-M5: `loading.tsx` skeletons (product, catalog, admin panel). W-L1: mobile menu focus. W-L9: dark-mode leftovers.
- W-L10: unit tests for `submitOrder` and the admin session.

### Not in scope
- Needs the user: unpriced units vs wholesale threshold (L8), order status history (L1), package manager choice (L7/S11).
- Needs assets or is a larger refactor: hero image 2× (W-L6), order rules extraction (M4), feature folders (L10), Playwright e2e.
- In a user's uncommitted file: footer link contrast in `web/app/(public)/layout.tsx` (W-L2).

## Tasks
- [x] T1 Slice A. Route: delegated writer (many non-trivial C# files).
- [x] T2 Slice B. Route: delegated writer (several non-trivial TS files), sequential after T1.
- [x] T3 Parent spot checks, work-unit commits.

## Delivery
Forecast ~700 authored lines across both slices: above the ~400 heuristic, so work stays split in work-unit commits per slice; PR slicing is the user's decision.

## Verification evidence
- Slice A: dotnet build 0 warnings/0 errors; dotnet test 247/247 (writer and parent rerun). Migration 20261115191600_AddAdminSecurityStamp appended to api/db/migrations.sql. Existing JWTs become invalid after deploy (stamp claim required).
- S7 deviation: Cloudinary has no signed max_file_size for direct uploads; size is checked in the browser, formats are signed.

- Slice A commit abd2975 (an earlier attempt accidentally included the user deletion of appsettings.Development.example.json; redone locally before any push).
- Slice B: eslint clean, tsc clean, vitest 244/244 (writer and parent rerun). Geo 429 bodies keep each route shape because lib/geo.ts reads .items; localidades also limited; no limit when no proxy IP header (local dev). next-themes removed; .dark tokens kept (shadcn dark: variants).
- Not verified in a browser: loading skeletons, mobile menu focus trap. next build not run for slice B (user dev server owns web/.next).

## Progress
All tasks done.
