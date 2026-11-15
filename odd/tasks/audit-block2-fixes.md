# Audit block 2 fixes

## Objective
Fix the "soon" findings from the 2026-11-15 system audit.

## Findings
- W-M1: intro overlay lets taps/focus reach the hidden page; W-L5 late scene callbacks can replay the reveal.
- W-M3: hero CTAs start at `opacity: 0` until JS hydrates; below-the-fold reveals stay hidden without JS.
- W-M4: `/catalogo/[categoria]` and `/producto/[slug]` render on every request.
- API-M2 / W-M6: root README describes the old curtain catalog and points to a deleted example config.
- API-M3 / B8: no CI.
- S2 / B6: no CSP (pending user decision: nonce CSP forces dynamic rendering).

## Tasks
- [x] T1 Intro: a tap or any key skips it; guard late callbacks. Route: delegated writer (with T2–T5).
- [x] T2 Hero entrance with CSS keyframes (works before/without JS, honours reduced motion); `<noscript>` fallback for scroll reveals.
- [x] T3 `generateStaticParams` for catalog and product pages; confirm ISR in build output.
- [x] T4 Root README rewritten for Eggy; config documented inline (no dependency on the deleted example file).
- [x] T5 GitHub Actions CI: web (lint, tsc, test, build) and api (build, test with Postgres service).
- [x] T6 CSP: user chose a static policy (keeps static rendering; allows inline scripts). Written in `web/next.config.ts` with HSTS in production; browser check pending. Route: inline (one file).

## Checks
web: `npx eslint .`, `npx tsc --noEmit`, `npx vitest run`, `npx next build --turbopack`; browser check of intro skip and hero.

## Verification evidence
- eslint, tsc clean; vitest 220/220.
- next build (writer, scratch copy): / static (1m revalidate); /catalogo/[categoria] and /producto/[slug] moved from dynamic to SSG on demand.
- Browser (user dev server :3000): CSP header present; full intro, key skip and admin login page with no CSP violations or console errors; hero items end at opacity 1; Space skips the intro without scrolling (preventDefault added after the first browser pass).
- Not verified: admin Cloudinary upload under CSP (needs an admin session), CI workflow run (YAML parsed only), no-JS rendering in a real browser (checked in built HTML).

## Progress
All tasks done.
