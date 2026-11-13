# Eggy — web

Public site and admin panel for **Eggy**, an egg distributor (retail and wholesale, own delivery truck, orders by
WhatsApp). Built with Next.js 15 (App Router), React 19, Tailwind CSS v4, shadcn/ui and Zustand.

## Getting started

```bash
npm install
cp .env.example .env.local   # API URL, site URL, brand name
npm run dev
```

The site reads the catalog, prices and settings from the API (`API_URL` / `NEXT_PUBLIC_API_URL`). Without the API
the home still renders, with empty price and order sections.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |

## Brand

- Theme tokens live in `app/globals.css` (egg red, eggshell cream, warm charcoal, yolk accents).
- Fonts: Montserrat for text and uppercase display titles, Yellowtail only for the `Wordmark` component.
- Home copy (steps, FAQ, wholesale conditions) lives in `lib/home-content.ts`; items marked "a confirmar con el
  cliente" are proposals pending client review.
