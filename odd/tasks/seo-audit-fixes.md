# SEO audit fixes

## Objective
Close the real gaps from an external SEO/quality checklist on the public Next.js site (`web/`).

## Audit triage (verified 2026-11-15)
Already satisfied, no change: `lang="es-AR"`, favicon (`app/icon.png`), `robots.ts` (allows `*`, no AI block), `sitemap.ts`, per-page titles via template, default meta description, `(public)/not-found.tsx`, alt text on content images, browser source maps off in production (Next default).

Real gaps: canonical tags, global Open Graph image, structured data (JSON-LD), `llms.txt`, root `app/not-found.tsx`, decorative `alt=""` on product thumbnails, unverified bundle size / console errors / SSR output.

## Delivery strategy
ask-on-risk. Forecast ~250 authored lines.

## Tasks
- [x] T1 Metadata: canonical (`alternates.canonical`) on home, category and product; global OG/Twitter metadata with a generated `app/opengraph-image.tsx`. Route: delegated (2+ files). Root `openGraph` omits title/description on purpose so pages inherit their own.
- [x] T2 Structured data: JSON-LD `Organization` on home, `Product` (Offer/AggregateOffer in ARS) on product page, `BreadcrumbList` on category. Route: delegated.
- [x] T3 `public/llms.txt`, explicit AI crawler allowance in `robots.ts`, root `app/not-found.tsx`. Route: delegated.
- [x] T4 Product-gallery thumbnails: buttons already labelled; label now names the product, decorative `alt=""` kept. Route: delegated.
- [x] T5 Verify. Route: delegated verification.
- [ ] T6 Reduce `/pedido` bundle (531 kB raw chunk, mostly full `zod` imported by `lib/order.ts`). Pending user decision.

## Verification evidence
- `pnpm lint`: clean (exit 0 on rerun; first run hit pnpm dependency check).
- `pnpm test`: 211/211 passed.
- `tsc --noEmit`: clean (parent spot check also clean).
- `pnpm build`: exit 0, 20/20 static pages; 0 `.map` files in `.next/static`.
- Built home HTML: canonical, og:*, twitter:*, single h1, Organization + FAQPage JSON-LD, ~103 kB SSR HTML.
- First Load JS: /pedido 365 kB, / 220 kB, /producto 209 kB, /catalogo 204 kB; shared 153 kB.

## Checks
`pnpm lint`, `pnpm test`, `pnpm build` in `web/`.

## Progress
T1–T5 done. Next: T6 pending decision.
