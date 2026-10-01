// La URL se usa en `new URL()` al cargar el layout: un valor vacío, sin esquema o con barra final no debe romper el build.
export function normalizeSiteUrl(value: string | undefined) {
  const raw = value?.trim().replace(/\/+$/, "");
  if (!raw) return "http://localhost:3000";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

// Datos de marca. Placeholders hasta recibir el material definitivo del cliente.
export const site = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "Fénix",
  tagline: "Barrales y accesorios para cortinas",
  description:
    "Catálogo de barrales de madera, accesorios y kits para cortinas. Armá tu pedido y envialo por WhatsApp para recibir tu cotización.",
  url: normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
};
