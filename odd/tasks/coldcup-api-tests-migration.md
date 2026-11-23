# ColdCup API tests migration

## Objective

Bring the API test suite in line with the ColdCup domain so `dotnet test` passes without weakening what the tests protect.

## Problem

77 of 254 tests in `api/tests/AccFenix.Api.Tests` fail on branch `coldcup-d` (baseline observed 2026-11-23).

## Why

The API moved to ColdCup (coffee menu, delivery in Moreno or pickup, Mercado Pago, no wholesale, no zones). Commit `6502735` migrated `DatabaseConstraintTests`, but most other test classes still assert the previous egg/wholesale business.

Baseline failures per class: OrderTests 47, PublicEndpointsTests 13, VariantPriceTests 9, AdminEndpointsTests 4, CatalogConsistencyTests 1, InfrastructureTests 1, SecurityTests 1, SeedGuardTests 1.

## Scope

- In: test code under `api/tests/AccFenix.Api.Tests`.
- Out: production code, and the untracked `api/src/AccFenix.Api/Migrations/` directory (must not be staged).

## Constraints

- Never weaken, skip, or delete an assertion only to get green.
- A test may be removed only when the behavior it covers no longer exists in ColdCup (for example wholesale pricing); record each removal group here.
- A failure that reveals a real production bug is reported, not fixed and not masked.
- Conventional Commits, without AI attribution (user rule).
- No push, PR, or merge.

## Tasks

- [x] T1: Migrate order tests and helpers to fulfillment (delivery/pickup). Route: delegated direct (2+ non-trivial files). Commit `f61bd72`.
- [x] T2: Migrate seed/catalog expectations from eggs to ColdCup. Route: delegated direct. Commit `f48890b`.
- [x] T3: Remove or adapt wholesale price coverage. Route: delegated direct. Commit `405f0df`.
- [x] T4: Triage remaining failures (Infrastructure, Security, SeedGuard, Admin) and report real bugs. Route: delegated direct. Commit `3c8fd9d`. One failure stays open by design (see Open failure).

- [x] T5: Make `ColdCupBase` the single migration baseline for a new database and regenerate `api/db/migrations.sql`. Route: inline (mechanical, generated). Committed together with this document.

## Acceptance criteria

- `dotnet test` from `api/` reports 0 failures, or every remaining failure is documented as a real production bug.
- No production file changed.

## Checks

- `dotnet test --nologo -v q` from `D:\Proyectos\AccFenix\api`

## Progress

- Baseline: 77 failed / 177 passed / 254 total.
- After T1 (`f61bd72`): OrderTests 60/60 passed; full suite 30 failed / 221 passed / 251 total.
- After T2 (`f48890b`): full suite 18 failed / 252 passed / 270 total (the seeded price theory now covers all 24 menu variants).
- After T3 (`405f0df`): full suite 6 failed / 264 passed / 270 total.
- After T4 (`3c8fd9d`): `dotnet test --nologo -v q`: 1 failed / 269 passed / 270 total.
- No production file changed: `git diff --stat 7938aa1..HEAD -- api/src` is empty.

## Removed tests

- Wholesale pricing (behavior no longer exists): `Variant_without_wholesale_price_falls_back_to_retail_in_a_wholesale_order`, `Units_quoted_on_request_do_not_count_towards_the_wholesale_threshold`.
- Wholesale assertions and inputs in `VariantPriceTests`, `CatalogConsistencyTests`, `AdminEndpointsTests`, `SecurityTests`: replaced by checks that responses do not expose wholesale fields where a response was asserted; retail coverage is kept.
- Zones (behavior no longer exists): zone, province, carrier and locality validation cases, replaced by fulfillment, time slot and pickup-without-address cases. `Location_update_rejects_invalid_input` went from 7 to 6 cases because the two locality cases became missing and blank address.
- Adapted rather than removed: `Order_at_exactly_the_threshold_uses_wholesale_prices` became `Large_multi_line_order_keeps_retail_prices`; `Public_settings_expose_default_threshold` became `Public_settings_expose_the_default_whatsapp_number`.
- Admin list coordinates: `AdminOrderSummaryDto` has no latitude or longitude, so that coverage moved to the order detail endpoint.

## Resolved failure

`InfrastructureTests.Migrations_script_contains_every_migration` stays failing and is not masked.

- Expected: `api/db/migrations.sql` records every EF migration.
- Actual: the only migration in the project, `20261123152252_ColdCupBase`, is absent. The script holds the 7 previous migrations, the last at `api/db/migrations.sql:592` (`20261115191600_AddAdminSecurityStamp`).
- Related: `api/src/AccFenix.Api/Migrations/` is untracked and has no git history, so a clean checkout has no migrations.
- Fix is outside this task's edit surface: commit the migration and regenerate the script as described in `README.md:99`.

## Next step

Run the pending native review of the migration slice.

## Review status

- Assessment for `7938aa1..3c8fd9d` (untracked excluded): medium, `slice_budget_reached`, 663 changed lines, review due.
- Native review did not start: the preflight requires an intended-untracked selection, and the submitted JSON was refused with `invalid_request`. The exact format is not documented in the CLI help. Status: unavailable, pending.
- Parent spot check: `dotnet test --nologo -v q`: 1 failed / 269 passed / 270 total; `git diff --stat 7938aa1..HEAD -- api/src` is empty.
- T5 checks: script applied twice on an empty `postgres:16-alpine` without errors (14 tables, history holds only `ColdCupBase`); `dotnet ef migrations has-pending-model-changes`: no changes; `dotnet test --nologo -v q`: 0 failed / 270 passed / 270 total.
