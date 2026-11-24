# Admin reviews section

## Objective
Give the admin panel a "Reseñas" section to see every review, register a review on behalf of a customer for a paid order, and delete reviews. Reviews the admin registers are published right away, like the ones customers leave.

## Problem / why
Reviews can only be created by the customer through the order's private link. Customers who send their opinion by WhatsApp cannot be published, and the admin has no way to list or remove reviews.

## Scope
- API (admin group, JWT-protected):
  - `GET /api/admin/reviews`: every review, newest first, with product name and slug, order number, rating, comment, author and date.
  - `GET /api/admin/reviews/order/{number}`: the products of an order that can still be reviewed (same rules as the public flow).
  - `POST /api/admin/reviews`: create a review for an order number and product, with rating, comment and an optional author name (defaults to the customer's first name).
  - `DELETE /api/admin/reviews/{id}`.
- Web: nav item "Reseñas", page `/admin/resenas` with a list (delete with confirmation) and a form to register a review (enter order number → pick product → stars → comment → author). Admin writes refresh the public product pages.

## Constraints
- A review must belong to a **paid** order (approved payment), one review per product per order, rating 1–5, comment up to 500 chars, author up to 60 chars and first name only. Reuse the same rules as the public review flow, without duplicating them.
- No schema migration.

## Tasks
- [x] T1 API admin review endpoints + tests. Route: delegated writer (2+ non-trivial files across API and web).
- [x] T2 Web admin reviews page, nav, actions, types. Route: same delegated writer.
- [x] T3 Parent spot check, full test run and work-unit commits.

## Acceptance criteria
- Admin lists reviews, registers one for a paid order (rejected for an unpaid order, a product not in the order, or a duplicate) and deletes one; the product page reflects the change.
- Anonymous calls to the admin review endpoints get 401.

## Decisions
- Shared rules live in `Services/ReviewRules.cs`; the public flow uses them with unchanged behavior.
- Author: first name, compound allowed ("María José"), single line, max 60 chars, repeated spaces collapsed (user decision).
- Refunded or cancelled orders are not reviewable, matching the public flow.
- The admin list has no server limit; the page paginates in memory like categorías.

## Verification evidence
- RED: new AdminReviewTests 20/21 failing before implementation (the passing one hit the missing route's 404).
- API: dotnet test 298/298 (writer and parent rerun).
- Web: tsc clean (parent rerun), eslint clean on changed files, vitest 174/174. UI not checked in a browser.

## Progress
All tasks done.
