import { availabilityLabel } from "@/lib/api";
import { mapsLink } from "@/lib/maps-url";
import type { OrderForm } from "@/lib/order";
import { totalUnits, type CartItem } from "@/stores/cart";

export function isWholesale(items: CartItem[], threshold: number) {
  return threshold > 0 && totalUnits(items) >= threshold;
}

/** Texto del pedido para WhatsApp: productos agrupados por catálogo, cantidades y datos de envío. Nunca incluye precios. */
export function buildOrderMessage(items: CartItem[], form: OrderForm, threshold: number): string {
  const units = totalUnits(items);
  const lines: string[] = ["¡Hola! Quiero hacer el siguiente pedido:"];

  if (isWholesale(items, threshold)) {
    lines.push("", `*PEDIDO MAYORISTA* (${units} unidades)`);
  }

  const byCategory = new Map<string, CartItem[]>();
  for (const item of items) {
    byCategory.set(item.categoryName, [...(byCategory.get(item.categoryName) ?? []), item]);
  }
  for (const [category, categoryItems] of byCategory) {
    lines.push("", `*${category}*`);
    for (const i of categoryItems) {
      const detail = i.valuesLabel ? ` — ${i.valuesLabel}` : "";
      const pending = i.availability === "aPedido" ? ` _(${availabilityLabel.aPedido.toLowerCase()})_` : "";
      lines.push(`• ${i.qty} × ${i.productName}${detail}${pending}`);
    }
  }
  lines.push("", `Total: ${units} ${units === 1 ? "unidad" : "unidades"}`);

  lines.push("", "*Contacto*", `Nombre: ${form.nombre}`, `Teléfono: ${form.telefono}`);

  lines.push("", "*Envío*");
  if (form.zona === "buenos-aires") {
    lines.push("Zona: Buenos Aires", `Localidad: ${form.localidad}`, `Dirección: ${form.direccion}`);
    if (form.ubicacion) lines.push(`Ubicación: ${mapsLink(form.ubicacion)}`);
  } else {
    lines.push(`Provincia: ${form.provincia}`, `Expreso de preferencia: ${form.expreso}`);
  }

  if (form.comentarios) lines.push("", `Comentarios: ${form.comentarios}`);

  return lines.join("\n");
}

/** Consulta directa por una variante puntual (botón "Pedir por WhatsApp" del catálogo). Nunca incluye precios. */
export function buildVariantMessage(productName: string, valuesLabel: string): string {
  return ["¡Hola! Quiero pedir:", `• ${productName} — ${valuesLabel}`, "", "¿Me pasan la cotización y el tiempo de entrega?"].join("\n");
}

/** Primer contacto de profesionales (decoradores, tapiceros, revendedores). */
export function buildProfessionalMessage(threshold: number): string {
  const volume = threshold > 0 ? ` (pedidos desde ${threshold} unidades)` : "";
  return [
    "¡Hola! Soy profesional del rubro y quiero cotizar por volumen" + volume + ".",
    "",
    "Rubro / empresa:",
    "Productos y cantidades aproximadas:",
    "Localidad de entrega:",
  ].join("\n");
}

export function whatsappUrl(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
