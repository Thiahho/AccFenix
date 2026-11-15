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
- [x] **T2 — API egg seed.** `CatalogSeeder` seeds egg products (N°1, N°2 × Cajón, Medio cajón, Maple) and tests stop
  referencing curtains. Route: delegated writer. Checks: `cd api && dotnet test` (needs Docker).
- [x] **T3 — Animated public navbar.** Header moved to client `components/site/site-header.tsx` (single source of
  section links in `lib/nav.ts`); scroll-aware compact/solid header, hide on scroll down, centre-grow underline,
  sliding scrollspy pill with `aria-current`, staggered load-in, wordmark wobble, burger→X morph and staggered
  mobile items; all motion behind `prefers-reduced-motion`. Route: delegated writer (2+ non-trivial files).
  Checks: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. Test-first: `pickActiveSection` and
  `nextHeaderScroll` pure logic (RED then GREEN); visual parts are the exception.
- [x] **T4 — Motion animations on the home.** `motion@14.14.0`, `m` + `LazyMotion`
  `domAnimation` strict, `MotionConfig reducedMotion="user"` in the public layout). Server sections keep fetching and
  wrap content in small client primitives (`components/motion/*`: Reveal, Stagger, StaggerItem, Pop, GrowX,
  ScrollLine, CountUp). Hero stagger + floating egg with hover wobble and light parallax; price board reveal, row
  stagger, price-tag spring pop, growing dash; how-we-work scroll-drawn connector and icon pop; catalog stagger,
  card hover lift, add-button tap; wholesale reveal and threshold count-up; FAQ native `<details>` with CSS height
  transition, spring chevron and answer slide-in; WhatsApp FAB delayed spring entrance and three pulses. Route:
  delegated writer (2+ non-trivial files). Checks: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
  Test-first exception: visual animation work, no extracted pure logic.
- [x] **T5 — Navbar capsules, always visible.** No bar background; wordmark in a red capsule, section links in a
  translucent charcoal capsule with the sliding red scrollspy pill, cart/menu in a charcoal capsule (cream text,
  amber focus rings). Hide-on-scroll removed (`nextHeaderScroll` → `isHeaderCompact`); compact only lifts the bar and
  deepens the shadow. On the home the header overlays the hero (`-mb-16`, hero top padding raised). Mobile menu panel
  becomes a floating rounded card. Route: delegated writer. Checks: `npm test`, `npm run lint`, `npx tsc --noEmit`.
  Test-first: `isHeaderCompact` RED then GREEN.
- [x] **T6 — "Cómo trabajamos" as a journey to the egg.** `lib/journey.ts` (`buildTrail`, `reachedStops`) builds a
  winding trail through measured checkpoint centres; `components/home/journey.tsx` draws it by scroll
  (`useScroll` + spring `pathLength`), lights Pedís / Confirmamos / Entregamos as the tip passes, a small truck rides
  the tip, and the goal egg wobbles with a yolk glow on arrival. Vertical on mobile, horizontal on desktop; `<ol>`
  in the DOM, art `aria-hidden`; reduced motion shows everything drawn and lit. `ScrollLine` removed (unused).
  Route: delegated writer. Checks: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. Test-first:
  `journey.test.ts` RED (module missing) then GREEN.
- [x] **T7 — Price board hover and crack sound.** Each price row is a client `components/home/price-row.tsx`
  `<button type="button">` (list `<ul>/<li>`, label like "Huevos N°1, Cajón, $ 60.000, mayorista …"). Hover (mouse) and
  keyboard `:focus-visible` slide the row, extend the dash in yolk, scale and tilt the red tag on a wobbly spring and
  light a yolk glow. Click/Enter/Space plays a synthesized egg crack (`lib/crack-sound.ts`: `planCrack` builds 3–5
  band-passed noise bursts inside 80 ms plus a quiet falling sine drip, varied per click; `playCrack` renders it with
  a lazily created, reused `AudioContext`, fails silently) and a tag shake plus a zig-zag SVG crack that draws and
  fades (<500 ms). No navigation or cart change. Reduced motion: no shake, hover transforms jump instead of springing (MotionConfig), the crack only fades. Route:
  delegated writer. Checks: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. Test-first:
  `crack-sound.test.ts` RED (module missing) then GREEN.
- [x] **T8 — Customer type on orders (API).** `CustomerType { Personal = 0, Business = 1 }` stored as integer like
  `DeliveryZone`; `Order.CustomerType` and `Order.BusinessName` (max 120, like `CustomerName`). `POST /api/orders`
  requires `customerType` ("personal" | "business"); `businessName` is required single-line trimmed text for business
  and dropped (stored null) for personal. Admin list and detail DTOs expose both. Migration `AddOrderCustomerType`
  (existing rows default to Personal) with `CK_Orders_CustomerType` and `CK_Orders_BusinessName`
  (`("CustomerType" = 1) = ("BusinessName" IS NOT NULL)`); `api/db/migrations.sql` regenerated. Route: delegated
  writer. Checks: `cd api && dotnet test`. Test-first: RED compile errors (types missing), then GREEN.
- [x] **T9 — Add to order from the price board and step-by-step checkout.** Tapping a price row still cracks the egg
  and adds one unit to the cart (`priceRowCartItem` in `lib/catalog.ts`, same item shape and `notifyAdded` toast as
  the product card; label "Agregar al pedido: …"; both availabilities are orderable, the row is disabled only when the
  variant is missing). The order form became a four-step checkout over one react-hook-form instance (`mode: onTouched`,
  `shouldUnregister: false`): ¿Para quién es? (Personal / Comercio cards, a pointer tap auto-advances, keyboard uses
  Enter) → ¿Cómo te llamás? (Nombre del comercio revealed for Comercio, nombre, teléfono) → ¿Dónde entregamos?
  (`components/site/delivery-fields.tsx`, previous logic) → Revisá y enviá (cart recap, comentarios, save then
  WhatsApp, fallback kept). Steps are an `<ol>` with `aria-current="step"`, locked steps `aria-disabled` on an inner
  group, done steps collapse to an editable summary chip; server field errors reopen the owning step. Pure step logic
  in `lib/orders/steps.ts`. Zod schema is `customer union ∩ zone union`; `customerType`/`businessName` sent to the API
  (business name trimmed, null for personal), WhatsApp adds "Cliente: Personal" / "Cliente: Comercio — <nombre>" in
  both messages, server `CustomerType`/`BusinessName` errors map to `cliente`/`comercio`, admin list and detail show a
  Personal/Comercio badge and the business name. Route: delegated writer. Checks: `npm test`, `npm run lint`,
  `npx tsc --noEmit`, `npm run build`. Test-first: RED then GREEN.

## Acceptance criteria

- No user-facing or test text in `web` or the API seed mentions barrales or cortinas.
- Home reads as an egg distributor and matches the reference palette and typography.
- All existing checks pass.

## Progress

| Task | Status | Commit | Verification |
| --- | --- | --- | --- |
| T1 | done | `f252662` | `npm test` 115/115 pass (15 files); `npm run lint` clean; `npx tsc --noEmit` clean; `npm run build` ok; purge grep only hits `AccFenix` API paths/cookie name (intentional). Not browser-checked. Pending: `app/icon.png`, `.env.example` brand name (outside T1 surface). |
| T2 | done | `a467585` | RED: new `Seeded_egg_variants_carry_retail_prices` + updated seed tests failed (12/16 in `PublicEndpointsTests`). GREEN: `dotnet test` 200/200 pass. `grep -rniE "barral\|cortina" api --include=*.cs \| grep -v Migrations` empty; migrations hold no curtain data. Seed: category Huevos, attribute Presentación (Cajón/Medio cajón/Maple), products Huevos N°1/N°2 with retail prices; wholesale left null (price on request). Catalog data marked placeholder pending client confirmation. |
| T3 | done | `b4cd3a9` | RED: new `lib/nav.test.ts` 11/11 failed (functions missing). GREEN: `npm test` 127/127 pass (16 files); `npm run lint` clean; `npx tsc --noEmit` clean; `npm run build` ok. Desktop CTA skipped (duplicates the "Hacé tu pedido" section link). Not browser-checked. |
| T4 | done | `31731a8` | `npm test` 127/127 pass (16 files); `npm run lint` clean; `npx tsc --noEmit` clean; `npm run build` ok. Home First Load JS 164 kB → 210 kB (+46 kB; `/pedido` 315 → 353 kB because the provider and FAB live in the public layout). `m` imported from `motion/react-m` and the count-up uses rAF instead of `animate()` to trim the bundle. Not browser-checked. |
| T5 | done | `affdcf4` | RED: `isHeaderCompact` 3/7 failed. GREEN: `npm test` 123/123; `npm run lint` clean; `npx tsc --noEmit` clean. Not browser-checked. |
| T6 | done | `fc3d789` | RED: `journey.test.ts` failed (module missing). GREEN: `npm test` 131/131 (17 files); `npm run lint` clean; `npx tsc --noEmit` clean; `npm run build` ok, home First Load JS 210 → 213 kB. Not browser-checked. |
| T7 | done | `bf6c03b` | RED: `crack-sound.test.ts` failed (module missing). GREEN: `npm test` 149/149 (18 files); `npm run lint` clean; `npx tsc --noEmit` clean; `npm run build` ok, home First Load JS 213 → 214 kB. Not browser-checked; sound cannot be verified headless. |
| T8 | done | `8c5264d` | RED: test build failed CS1061/CS0103/CS0117 (`CustomerType`, `BusinessName`, `OrderLimits.BusinessName` missing). GREEN: `dotnet test --artifacts-path .artifacts/test` 209/209 (running API locked `bin`; migration generated from a project copy for the same reason). `api/db/migrations.sql` applied twice to a throwaway Postgres 16: both runs exit 0, 10 `CK_Orders_*` constraints present. Web not updated yet. |
| T9 | done | `853f452`, `5b3ea98` | RED: 13 failed / 149 passed plus `steps.test.ts` not loading (module missing). GREEN: `npm test` 176/176 (19 files); `npm run lint` clean; `npx tsc --noEmit` clean; `npm run build` ok, home First Load JS 214 → 216 kB, `/pedido` 353 → 359 kB. Not browser-checked; not exercised against a running API. |
