// La URL se usa en `new URL()` al cargar el layout: un valor vacío, sin esquema o con barra final no debe romper el build.
export function normalizeSiteUrl(value: string | undefined) {
  const raw = value?.trim().replace(/\/+$/, "");
  if (!raw) return "http://localhost:3000";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

// Brand data. Placeholders until the client delivers the final material.
export const site = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "ColdCup",
  tagline: "Cafés fríos",
  description:
    "Cafés fríos para llevar o pedir a domicilio en Moreno. Elegí tu bebida, tamaño y extras, y pagá con Mercado Pago.",
  url: normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
};
