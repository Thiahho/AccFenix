# eggy-rebrand

Branch: `EGG-main`. Engram mirror: `odd/eggy-rebrand/tasks`. Follows the rebranding backlog item of `egg-wholesale-ordering`.

## Objective

Replace every curtain-rod ("barrales", "cortinas") reference and the neutral shadcn look with the "Eggy" egg
distributor brand, using `docs/img/image1.png` (price board story) and `docs/img/image2.png` ("Somos Eggy") as
temporary references.

## Scope

In scope: web theme (palette, fonts, wordmark), home sections and copy, product card, removal of curtain-only
sections and assets, curtain mentions in web tests and copy; API catalog seed and its tests.
Out of scope: final client photography and logo, icon/favicon redesign, new business features.

## Visual direction (from references)

- Egg red primary (~`#B3121B`), cream/eggshell background, warm charcoal dark sections, warm orange-brown accents.
- Bold uppercase geometric sans for headings (Montserrat 800/900); script wordmark "Eggy" in red (Yellowtail).
- Price board: dark section, "HUEVOS | N°1" headings, rows Cajón / Medio cajón / Maple, prices in red tags.

## Tasks

- [x] **T1 — Web rebrand.** Theme tokens, fonts, wordmark, hero with `image2`, price board section, product card,
  remove curtain intro / projects gallery, egg copy (how we work, wholesale, FAQ), purge curtain mentions in `web`.
  Route: delegated writer (2+ non-trivial files). Checks: `npm test`, `npm run lint`, `npx tsc --noEmit`,
  `npm run build`, no `barral|cortina` match in `web` sources. Test-first exception: visual/copy change; existing
  tests updated, no meaningful RED.
- [ ] **T2 — API egg seed.** `CatalogSeeder` seeds egg products (N°1, N°2 × Cajón, Medio cajón, Maple) and tests stop
  referencing curtains. Route: delegated writer. Checks: `cd api && dotnet test` (needs Docker).

## Acceptance criteria

- No user-facing or test text in `web` or the API seed mentions barrales or cortinas.
- Home reads as an egg distributor and matches the reference palette and typography.
- All existing checks pass.

## Progress

| Task | Status | Commit | Verification |
| --- | --- | --- | --- |
| T1 | done | see `git log` (feat(web): rebrand site to Eggy egg distributor) | `npm test` 115/115 pass (15 files); `npm run lint` clean; `npx tsc --noEmit` clean; `npm run build` ok; purge grep only hits `AccFenix` API paths/cookie name (intentional). Not browser-checked. Pending: `app/icon.png`, `.env.example` brand name (outside T1 surface). |
| T2 | pending | | |
