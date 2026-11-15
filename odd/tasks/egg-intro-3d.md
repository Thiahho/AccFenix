# Egg intro 3D

## Objective
Replace the flat SVG first-visit intro with a real-time 3D animation (three.js): an egg drops in, rocks, cracks, splits
with flying shell shards and a glossy jiggling yolk, then the camera dives into the yolk while the page settles.

## Why
The SVG version read as a drawing; the user wants animation quality. No video asset is available, so it is rendered live.

## Constraints
- Plays once per session, never under /admin, never with reduced motion (inline script gate, unchanged).
- three.js loads only through a dynamic import on a first visit; no cost for returning visitors or crawlers.
- Never block the site: skip the intro if the scene is not ready within the load budget, if WebGL fails, or on error.
- Server HTML and SEO unaffected; overlay has no text or images.

## Tasks
- [x] T1 Pure timeline/profile helpers with unit tests (`lib/intro/timeline.ts`). Route: inline.
- [x] T2 three.js scene (`lib/intro/egg-scene.ts`), client loader (`components/site/intro-scene.tsx`), overlay + CSS. Route: inline (creative iteration needs the browser loop; recorded deviation from the 2+ file writer trigger).
- [x] T3 Visual check frame by frame in the browser, console clean, lint/tests/build, bundle impact.

## Checks
`pnpm test`, `npx tsc --noEmit`, `npx eslint`, `pnpm build`, browser pass.

## Verification evidence
- RED observed (module missing), then GREEN: timeline tests 6/6; full suite 217/217.
- tsc clean, eslint clean on changed files.
- Browser (dev, fake clock): drop, crack, split with shards + yolk, dive into yolk all render; console clean; 6 s safety timer clears the overlay.
- Not verified: phone-sized viewport (window resize did not apply); portrait fit relies on the FOV formula.
- pnpm build: / First Load JS unchanged at 220 kB; three.js lazy chunk 532 kB raw / 131 kB gzip, first visit only.
- package-lock.json synced (repo uses npm lockfile).

## Progress
All tasks done.
