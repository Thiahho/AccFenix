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
- [ ] T3 Variants grid: card list per variant below `sm`, table from `sm` up; bulk buttons touch-sized on mobile; price-fill row stacks cleanly. Route: delegated.
- [ ] T4 Small fixes: attributes-editor value row fits on one line, product tabs `h-11 md:h-8`, product-form submit full width on mobile and larger Todos/Ninguno target, media-manager `sizes` fix. Route: delegated.

## Acceptance criteria
- No admin page needs horizontal page scroll at 360px to reach actions or edit fields.
- Tap targets on mobile are ≥ 44px for primary actions.
- Desktop layout unchanged.

## Progress
- Audit done (explorer).
- T1 done (`fix(admin): compact sticky mobile header`): icon-only Volver/Salir in the mobile brand row (desktop block unchanged via `hidden md:block`), header `sticky top-0 z-30 md:z-auto`, nav links `py-3 md:py-2`, active link scrolled into view below `md`. Checks: `npx tsc --noEmit -p .` pass; `npx eslint` on changed files pass.
- T2 done (`fix(admin): fit tables and page headers on phones`): categorías Atributos column `hidden sm:table-cell` with a `sm:hidden` line under the name; pedidos Estado column hidden below `sm` with the badge in the Pedido cell; wrapped name/product/total-label cells; pagination and bulk Eliminar `h-11 md:h-7`; "· N pedidos" hidden below `sm`; `PageHeader` actions `flex-wrap`. Checks: `npx tsc --noEmit -p .` pass; `npx eslint` on changed files pass.

## Next step
T3.
