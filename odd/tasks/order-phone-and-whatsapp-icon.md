# Required order phone and iced-cup WhatsApp icon

## Objective
1. The checkout asks for the customer's phone again, now required, so every order (especially the ones paid online with Mercado Pago, which never pass through WhatsApp) can be coordinated.
2. The floating WhatsApp button uses an iced-coffee cup icon with a "W" instead of the generic chat bubble.

## Problem / why
Commit 96ff1e9 removed the phone because orders were sent from the customer's own WhatsApp. With Checkout Pro, paid orders arrive without any contact. User decision: the phone is required.

## Scope
- API: `CreateOrderRequest.Phone` required (validator in `OrderEndpoints.cs`), stored trimmed. Column stays nullable (older orders have none); no migration.
- Web: phone field in `components/site/order-form.tsx` and the order model in `lib/order.ts` (and wherever the request body is built); remove the "no phone" comments; Argentine-friendly hint and `type="tel"`, `autoComplete="tel"`, `inputMode="tel"`. The WhatsApp order message includes the phone if the message lists customer data.
- Web: new compact icon component (iced cup silhouette + straw + bold "W", `currentColor`), used by `components/home/whatsapp-fab.tsx`. Keep the green button and the accessible label.

## Constraints
- Phone validation: 8–20 characters of digits, spaces, `+`, `-`, `(`, `)`; at least 8 digits. Same rule on web and API; Spanish messages.
- Admin order detail already shows the phone and the chat link (`lib/admin/orders.ts` `whatsappChatHref`); keep it working.

## Tasks
- [x] T1 API: required phone + tests. Route: delegated writer (2+ non-trivial files across API and web).
- [x] T2 Web: phone field in checkout + order model + tests. Route: same writer.
- [x] T3 Web: iced-cup WhatsApp icon in the floating button. Route: same writer.
- [x] T4 Parent spot check and work-unit commits.

## Acceptance criteria
- An order without a phone, or with an invalid one, is rejected by the API (400) and blocked by the form with a Spanish message.
- A valid phone is stored and shows in the admin order detail.
- The floating button shows the cup with a "W" at 20px, legible, with `aria-label` unchanged.

## Decisions
- T1 and T2 ship in one commit: with only the API change, every checkout from the current web would be rejected.
- Edit surface widened with user approval to `web/lib/orders/*` and `web/app/actions/orders.test.ts` (request body, error mapping, checkout steps).
- `OrderLimits.Phone` (40) stays as the column size; new orders validate against 8–20 chars and at least 8 digits.
- Removed the checkout line "Te respondemos por WhatsApp, al número desde el que nos mandes el pedido."; the collapsed contact step shows "nombre · teléfono".
- Only the floating button got the cup icon; `/pedido/gracias` still uses `MessageCircleIcon` for "Enviar comprobante".

## Verification evidence
- RED: API OrderTests 2/60 failing before the change; web 6 failing (schema ×2, request, response, steps ×2) plus phone helper missing.
- API: dotnet test 314/314. Web: tsc clean, eslint clean, vitest 200/200 (parent reran vitest and tsc).
- Not checked in a browser (form and 20 px icon).

## Progress
All tasks done.
