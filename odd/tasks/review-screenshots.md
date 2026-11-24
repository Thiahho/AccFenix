# Review screenshots ("Lo que dicen nuestros clientes")

## Objective
Let the admin upload screenshots of reviews received by Instagram or WhatsApp and show the published ones in a gallery on the home page, to build trust with new customers.

## Problem / why
A lot of customer feedback arrives by Instagram and WhatsApp, but the store only shows verified reviews tied to paid orders.

## Scope
Approved plan: `C:\Users\thexe\.claude\plans\logical-baking-sloth-of-e34f5e47-453e-44d2-be25-45cf390b40b9.md`.
- API: `Testimonial` entity + migration + regenerated `api/db/migrations.sql`; admin CRUD (`/api/admin/testimonials`); public `GET /api/testimonials` (published, sorted, max 24).
- Web admin: "Capturas" tab in `/admin/resenas` (upload, privacy checkbox, caption, source, publish, reorder, delete). `uploadToCloudinary` extracted to `lib/admin/cloudinary-upload.ts`.
- Web public: home section between the price board and "Cómo trabajamos", hidden when empty.

## Constraints
- User decision: home section only, not tied to products. Never labeled "Compras verificadas".
- Privacy: the upload requires confirming that names, profile photos and phone numbers are covered.
- The home page stays static/ISR (`catalog` tag).

## Tasks
- [x] T1 API entity, migration, endpoints + tests. Route: delegated writer (2+ non-trivial files across API and web).
- [x] T2 Web admin "Capturas" tab + upload helper refactor. Route: same writer.
- [x] T3 Home gallery section. Route: same writer.
- [x] T4 Parent spot check and work-unit commits (one per T1–T3).

## Acceptance criteria
- Anonymous admin calls get 401; foreign URLs are rejected; only published screenshots appear publicly, in order; delete removes the row and, best effort, the Cloudinary file.
- The home shows the section only when there are published screenshots; the dialog opens and closes with the keyboard.

## Decisions
- `lib/api.ts` (public types and `api.testimonials()`) ships with T2 because the admin code imports its types.
- The upload helper takes the signature action as a parameter so vitest never loads server code.
- Delete reuses `DeleteBestEffortAsync` through a transient `Media` (MediaStorage was out of the edit surface).
- Known gap: the shared upload signature still allows video formats; the web uploader and the API reject non-images, but a crafted upload could leave an orphan video in Cloudinary.

## Verification evidence
- RED: API tests did not compile without the domain, then 14/14 failed with 404 before the endpoints; helper test failed before the module existed.
- API: dotnet test 314/314 (writer and parent rerun). migrations.sql diff: 40 added, 0 removed.
- Web: tsc clean, eslint clean, vitest 178/178, `next build` ok with `/` still static (○). Not checked in a browser.

## Progress
All tasks done.
