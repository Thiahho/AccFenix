import type { OrderForm } from "@/lib/order";
import { pickupSlot } from "@/lib/orders/pickup-time";
import type { CreateOrderRequest } from "@/lib/orders/types";

/** A cart line as far as the API cares: which variant and how many. Any price on it is ignored. */
export type OrderLine = { variantId: number; qty: number; addonValueIds?: number[] };

/**
 * Builds the body of `POST /api/orders`. The API requires a customer type and ColdCup sells to people, so it is always
 * "personal". The address only travels for delivery; empty comments are left out.
 */
export function buildOrderRequest(form: OrderForm, lines: OrderLine[]): CreateOrderRequest {
  const comments = form.comentarios?.trim();
  const delivery = form.entrega === "envio";
  return {
    fulfillment: delivery ? "delivery" : "pickup",
    customerType: "personal",
    customerName: form.nombre.trim(),
    phone: form.telefono.trim(),
    timeSlot: delivery ? form.horario.trim() : pickupSlot(form.horario),
    ...(delivery ? { address: (form.direccion ?? "").trim() } : {}),
    ...(comments ? { comments } : {}),
    items: lines.map((l) => ({
      variantId: l.variantId,
      quantity: l.qty,
      ...(l.addonValueIds?.length ? { addonValueIds: l.addonValueIds } : {}),
    })),
  };
}
