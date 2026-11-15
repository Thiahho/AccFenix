# Re-audit low findings

## Objective
Close the low-severity issues found by the 2026-11-15 re-audit.

## Scope
### Web (delegated writer, first)
- N2: mobile menu closes when the viewport reaches the desktop breakpoint (no stuck focus trap / scroll lock).
- N3: geo rate limiter evicts in batches when full (no O(n) prune per new key); document that IP headers are trusted because Vercel overwrites them.
- N4: `upgrade-insecure-requests` only when the API origin is https.
- N5: `UploadSignature` type carries `allowedFormats`, `maxImageBytes`, `maxVideoBytes` (remove the cast).
- Orders actions: ids must be positive integers (not only `Number.isInteger`).
### API (delegated writer, after web)
- Cloudinary best-effort deletes run with bounded parallelism and a per-call timeout.
- Test that `api/db/migrations.sql` contains every migration id.
- README note: login lockout and rate limits are in-memory, single API instance.

### Not changed (decision recorded)
- One DB query per admin request for the security stamp: negligible at admin traffic; caching adds staleness after a reset.
- IP header trust: deployment is Vercel (`eggy-huevos.vercel.app`), which overwrites `x-real-ip` / `x-forwarded-for`.
- A geo 429 shows "no results" like the existing 502: UI decision, unchanged.

## Tasks
- [x] T1 Web lows. Route: delegated writer.
- [x] T2 API lows. Route: delegated writer, sequential.
- [x] T3 Spot checks and work-unit commits.

## Verification evidence
- Web (6f50396): eslint, tsc clean; vitest 246/246. Mobile menu resize and the CSP flag have no tests and were not browser-checked.
- API: dotnet test 259/259 (writer and parent rerun). Cloudinary SDK 1.27.1 has no cancellable DestroyAsync; bounded with WaitAsync plus Api.Timeout 10 s.

## Progress
All tasks done.
