import { availabilityLabel } from "@/lib/api";
import { mapsLink } from "@/lib/maps-url";
import type { OrderForm } from "@/lib/order";
import type { CreatedOrder, OrderItem } from "@/lib/orders/types";
import { cartTotals, formatArs, isWholesale, lineSubtotal, unitPrice } from "@/lib/pricing";
import { totalUnits, type CartItem } from "@/stores/cart";

export { isWholesale };

/**
 * Texto del pedido para WhatsApp: productos agrupados por catálogo, cantidades y datos de envío.
 * Si alguna variante tiene precio, cada línea lleva precio unitario y subtotal y el mensaje cierra con el total.
 * When the order was already stored, the message names its number and uses the prices the server snapshotted.
 */
export function buildOrderMessage(items: CartItem[], form: OrderForm, threshold: number, saved?: SavedOrder): string {
  const units = totalUnits(items);
  const lines: string[] = ["¡Hola! Quiero hacer el siguiente pedido:"];
  if (saved) lines.push(`*Pedido #${saved.number}*`);
  const totals = saved ? savedTotals(saved) : cartTotals(items, threshold);
  const hasPrices = totals.pricedLines > 0;
  const linePrice = saved
    ? savedLinePrice(saved)
    : (item: CartItem): LinePrice => ({ price: unitPrice(item, totals.wholesale), subtotal: lineSubtotal(item, totals.wholesale) });

  if (totals.wholesale) {
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
      lines.push(`• ${i.qty} × ${i.productName}${detail}${pending}${hasPrices ? priceSuffix(linePrice(i)) : ""}`);
    }
  }
  lines.push("", `Total: ${units} ${units === 1 ? "unidad" : "unidades"}`);

  lines.push("", "*Contacto*", customerLine(form), `Nombre: ${form.nombre}`, `Teléfono: ${form.telefono}`);

  lines.push("", "*Envío*");
  if (form.zona === "buenos-aires") {
    lines.push("Zona: Buenos Aires", `Localidad: ${form.localidad}`, `Dirección: ${form.direccion}`);
    if (form.ubicacion) lines.push(`Ubicación: ${mapsLink(form.ubicacion)}`);
  } else {
    lines.push(`Provincia: ${form.provincia}`, `Expreso de preferencia: ${form.expreso}`);
  }

  if (form.comentarios) lines.push("", `Comentarios: ${form.comentarios}`);

  if (hasPrices) {
    const applied = totals.wholesale ? "precios mayoristas" : "precios minoristas";
    lines.push("", `*${totals.partial ? "Total parcial" : "Total"}: ${formatArs(totals.total)}* (${applied})`);
    if (totals.partial) lines.push("Los productos sin precio se cotizan por WhatsApp.");
  }

  return lines.join("\n");
}

/** "Cliente: Comercio — Almacén Don Pepe" or "Cliente: Personal"; a personal order never shows a business name. */
function customerLine(form: OrderForm) {
  return form.cliente === "comercio" ? `Cliente: Comercio — ${form.comercio.trim()}` : "Cliente: Personal";
}

/** The parts of a stored order the message needs. */
export type SavedOrder = Pick<CreatedOrder, "number" | "isWholesale" | "total" | "hasUnpricedItems"> & {
  items: Pick<OrderItem, "variantId" | "unitPrice" | "subtotal">[];
};

type LinePrice = { price: number | null; subtotal: number | null };

function savedTotals(saved: SavedOrder) {
  const pricedLines = saved.items.filter((i) => i.unitPrice !== null).length;
  return { wholesale: saved.isWholesale, total: saved.total, pricedLines, partial: saved.hasUnpricedItems };
}

function savedLinePrice(saved: SavedOrder) {
  const byVariant = new Map(saved.items.map((i) => [i.variantId, i]));
  return (item: CartItem): LinePrice => {
    const line = byVariant.get(item.variantId);
    return { price: line?.unitPrice ?? null, subtotal: line?.subtotal ?? null };
  };
}

function priceSuffix({ price, subtotal }: LinePrice) {
  if (price === null || subtotal === null) return " — precio a consultar";
  return ` — ${formatArs(price)} c/u = ${formatArs(subtotal)}`;
}

/** Consulta directa por una variante puntual (botón "Pedir por WhatsApp" del catálogo). No incluye precios. */
export function buildVariantMessage(productName: string, valuesLabel: string): string {
  return ["¡Hola! Quiero pedir:", `• ${productName} — ${valuesLabel}`, "", "¿Me confirman el total y el día de entrega?"].join("\n");
}

/** First contact from a business (shop, grocery, restaurant) asking for wholesale prices. */
export function buildWholesaleMessage(threshold: number): string {
  const volume = threshold > 0 ? ` (pedidos desde ${threshold} unidades)` : "";
  return [
    "¡Hola! Tengo un comercio y quiero comprar por mayor" + volume + ".",
    "",
    "Comercio / rubro:",
    "Productos y cantidades aproximadas:",
    "Localidad de entrega:",
  ].join("\n");
}

export function whatsappUrl(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
