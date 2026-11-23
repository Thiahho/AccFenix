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
- [ ] T2: Upgrade Next, React, and required tooling. Route: delegated direct.
- [ ] T3: Apply required code migrations and confirm behavior parity. Route: delegated direct.
- [ ] T4: Re-run the hydration A/B evidence and full purchase flow. Route: delegated direct.

## Acceptance criteria

- `next` is 16.4.6 and lint, tests, and build pass.
- 0 runs with #418 in at least 16 unmodified full browser runs.
- Delivery and pickup orders, admin login, and response security headers behave as before.

## Checks

From `web/`: `npm run lint`, `npm test`, `npm run build`, plus repeated full browser runs against a production build with the mock API.

## Progress

- T1 gate passed. `next@16.4.6` vendors `react-dom` `19.3.0-canary-278794d7-20261002`; its production client `replaySuspendedUnitOfWork` (host component case) restores `nextHydratableInstance` from `fiber.stateNode`, the same logic as `react-dom` 19.3.1 and the A/B patch.
- T1 baseline on the 15.5.29 production build with the mock API: 66 header and redirect cases (anonymous, cookie, RSC) and the admin flow. Anonymous `/admin*` redirects 307 to `/admin/login`; login sets an httpOnly, Secure, Lax cookie; an expired token lands on `/admin/login?expirada=1`; the first public request after an admin write shows the new value. There are no API rewrites, so `/api/*` is 404 from Next.

## Next step

Start T2.
