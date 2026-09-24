import { availabilityLabel } from "@/lib/api";
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
  } else {
    lines.push(`Provincia: ${form.provincia}`, `Expreso de preferencia: ${form.expreso}`);
  }

  if (form.comentarios) lines.push("", `Comentarios: ${form.comentarios}`);

  return lines.join("\n");
}

export function whatsappUrl(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
