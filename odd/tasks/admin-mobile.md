# Admin panel mobile layout

## Objective
Make the admin panel fully usable at phone width (360–400px).

## Problem
An audit found tables whose actions start off-screen (categorías, pedidos), a variants grid that needs sideways scrolling to edit prices, value rows that wrap raggedly, 28px tap targets (`size="sm"`), and a ~160px non-sticky mobile header.

## Scope
`web/app/admin/(panel)/**`, `web/components/admin/**`. No API or behavior changes. Desktop (`md+`) look must stay unchanged.

## Constraints
- Tailwind responsive prefixes only; keep desktop identical.
- Reuse existing primitives; `ui/table.tsx` already scrolls horizontally but forces `whitespace-nowrap`.
- No runnable UI test harness for layout: test-first exception; checks are `tsc --noEmit`, `next lint`, and structural readback.

## Tasks
- [x] T1 Mobile header: Volver/Salir as icon buttons in the brand row, compact sticky header, nav scrolls active link into view, `py-3 md:py-2` links. Route: delegated (2+ files, writer trigger).
- [x] T2 Tables and headers: categorías hides Atributos below `sm` (shown under name), pedidos moves status badge into first cell below `sm` and wraps names, pedido detail and products-table wrap text cells, pagination/bulk buttons touch-sized on mobile, `PageHeader` actions `flex-wrap`. Route: delegated.
- [x] T3 Variants grid: card list per variant below `sm`, table from `sm` up; bulk buttons touch-sized on mobile; price-fill row stacks cleanly. Route: delegated.
- [x] T4 Small fixes: attributes-editor value row fits on one line, product tabs `h-11 md:h-8`, product-form submit full width on mobile and larger Todos/Ninguno target, media-manager `sizes` fix. Route: delegated.

## Acceptance criteria
- No admin page needs horizontal page scroll at 360px to reach actions or edit fields.
- Tap targets on mobile are ≥ 44px for primary actions.
- Desktop layout unchanged.

## Progress
- Audit done (explorer).
- T1 done (`fix(admin): compact sticky mobile header`): icon-only Volver/Salir in the mobile brand row (desktop block unchanged via `hidden md:block`), header `sticky top-0 z-30 md:z-auto`, nav links `py-3 md:py-2`, active link scrolled into view below `md`. Checks: `npx tsc --noEmit -p .` pass; `npx eslint` on changed files pass.
- T2 done (`fix(admin): fit tables and page headers on phones`): categorías Atributos column `hidden sm:table-cell` with a `sm:hidden` line under the name; pedidos Estado column hidden below `sm` with the badge in the Pedido cell; wrapped name/product/total-label cells; pagination and bulk Eliminar `h-11 md:h-7`; "· N pedidos" hidden below `sm`; `PageHeader` actions `flex-wrap`. Checks: `npx tsc --noEmit -p .` pass; `npx eslint` on changed files pass.
- T3 done (`fix(admin): edit variants as cards on phones`): below `sm` a card per visible variant (attribute labels, status badge, two labelled price inputs, availability switch) using the same drafts/handlers as the table, with unique `variant-card-*` ids; table `hidden sm:block`; bulk/apply/save buttons `h-11 md:h-7`; price-fill inputs share the row on mobile and save goes full width; filter label `w-full sm:w-20`. Checks: `npx tsc --noEmit -p .` pass; `npx eslint components/admin/variants-grid.tsx` pass.
- T4 done (`fix(admin): small mobile fixes in product and attribute forms`): attribute value row `w-14 md:w-16` order and `min-w-0 md:min-w-36` value input, card header `flex-wrap`; product tabs full width below `sm`, `h-11` below `md` (overrides the primitive's `group-data-horizontal/tabs:h-8`); product submit `w-full sm:w-auto`; Todos/Ninguno hit area padded with negative margin below `md`; media `sizes` adds the 100vw single-column case. Checks: `npx tsc --noEmit -p .` pass; `npx eslint` on changed files pass.
- Commits: T1 7da2f6a, T2 6235d5c, T3 44334b0, T4 see `git log`. Not yet checked in a real browser at 360px.

## Next step
Manual check at 360px and desktop in a browser; native review assessment of the slice.
