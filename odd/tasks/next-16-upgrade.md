# Next 16 upgrade

## Objective

Upgrade the web app from Next 15.5.29 to Next 16.4.6 and remove the intermittent React #418 hydration error on `/pedido`.

## Problem

Full browser runs intermittently throw React #418. Investigation points to a hydration replay bug: with the `react-dom` 19.3.1 cursor restore injected in a test harness, failures went from 5/16 runs to 0/15. This is strong but not conclusive evidence.

## Why

The user chose to upgrade Next on 2026-11-23. 15.5.29 is the newest 15.x release.

## Scope

- In: Next, React, and directly required peer or tooling updates; code changes required by the Next 16 upgrade.
- Out: visual changes, business logic, API, the WhatsApp button overlap, and open product decisions.

## Constraints

- First verify the React build vendored by Next 16.4.6 contains the cursor restore. If it does not, stop and report before changing the repository.
- Security headers, CSP, redirects, admin protection, and cache behavior must stay equivalent, including any `middleware.ts` to `proxy.ts` migration.
- CI uses Node 20; the upgrade must remain compatible (Next requires >=20.9.0).
- Do not weaken tests. Record any test change.
- Conventional Commits without AI attribution. No push, PR, or merge.

## Tasks

- [x] T1: Verify the fix is present and capture a behavior baseline. Route: delegated direct (evidence prepares the write).
- [x] T2: Upgrade Next, React, and required tooling. Route: delegated direct.
- [x] T3: Apply required code migrations and confirm behavior parity. Route: delegated direct.
- [x] T4: Re-run the hydration A/B evidence and full purchase flow. Route: delegated direct (long browser runs).

## Acceptance criteria

- `next` is 16.4.6 and lint, tests, and build pass.
- 0 runs with #418 in at least 16 unmodified full browser runs.
- Delivery and pickup orders, admin login, and response security headers behave as before.

## Checks

From `web/`: `npm run lint`, `npm test`, `npm run build`, plus repeated full browser runs against a production build with the mock API.

## Progress

- T1 gate passed. `next@16.4.6` vendors `react-dom` `19.3.0-canary-278794d7-20261002`; its production client `replaySuspendedUnitOfWork` (host component case) restores `nextHydratableInstance` from `fiber.stateNode`, the same logic as `react-dom` 19.3.1 and the A/B patch.
- T1 baseline on the 15.5.29 production build with the mock API: 66 header and redirect cases (anonymous, cookie, RSC) and the admin flow. Anonymous `/admin*` redirects 307 to `/admin/login`; login sets an httpOnly, Secure, Lax cookie; an expired token lands on `/admin/login?expirada=1`; the first public request after an admin write shows the new value. There are no API rewrites, so `/api/*` is 404 from Next.
- T2: `next` and `eslint-config-next` are pinned at 16.4.6; `react` stays 19.1.0 because the peer range allows it and the App Router bundles the vendored React (its version string is in the built chunks). ESLint uses the native flat exports, `revalidateTag("catalog")` became `updateTag("catalog")` to keep read-your-writes, and Next rewrote `tsconfig.json` (`jsx: react-jsx`). Lint, tests, typecheck, and build pass.
- T3: the official codemod moved `middleware.ts` to `proxy.ts`; the matcher and logic are unchanged. All 66 cases keep their security headers and the admin flow is identical. Differences are framework behavior: `/catalogo/no-existe` now returns 404 instead of 200, `/admin` with a cookie now returns a server 307 to `/admin/productos`, and RSC requests without `_rsc` are redirected to add it.
- T4: a rebuilt Playwright harness alternated runs between production builds of 15.5.29 (`793f887`) and 16.4.6 (`dc2b94f`) with a mock API. #418 appeared in 20/80 control runs and 0/62 completed candidate runs. In the two batches without a server failure it was 13/48 versus 0/48. Delivery and pickup payloads, admin login, and security headers on `/`, `/pedido`, and `/admin/login` match. Lint has 0 errors and 1 warning, 157 tests pass, and the build passes.
- T4 open items: the candidate `next start` process stopped once at run 14 of the second batch, failing 18 runs. Its output was not captured, so the cause is unknown; a 32-run rerun with server logging had no crash. Node 20 (CI) was not run locally; the checks used Node 24.15.0. Real fonts, the real API, and real Mercado Pago were not exercised.

## Next step

Confirm the build and tests on Node 20 through CI or a local Node 20, and watch for `next start` exits. Push, PR, and merge remain the user's decision.
