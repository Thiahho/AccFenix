import type { OrderForm } from "@/lib/order";
import type { CreateOrderRequest } from "@/lib/orders/types";

/** A cart line as far as the API cares: which variant and how many. Any price on it is ignored. */
export type OrderLine = { variantId: number; qty: number };

/**
 * Builds the body of `POST /api/orders` from the form and the cart. Fields of the zone that was not chosen are
 * left out (the API rejects them, even as empty strings), and so are empty comments. A personal order never carries a
 * business name, even one left over from switching the customer type.
 */
export function buildOrderRequest(form: OrderForm, lines: OrderLine[]): CreateOrderRequest {
  const comments = form.comentarios?.trim();
  const base = {
    customerType: form.cliente === "comercio" ? ("business" as const) : ("personal" as const),
    businessName: form.cliente === "comercio" ? form.comercio.trim() : null,
    customerName: form.nombre.trim(),
    phone: form.telefono.trim(),
    ...(comments ? { comments } : {}),
    items: lines.map((l) => ({ variantId: l.variantId, quantity: l.qty })),
  };

  if (form.zona === "buenos-aires") {
    return {
      zone: "buenosAires",
      ...base,
      locality: form.localidad.trim(),
      address: form.direccion.trim(),
      ...(form.ubicacion ? { latitude: form.ubicacion.lat, longitude: form.ubicacion.lng } : {}),
    };
  }
  return { zone: "otherProvince", ...base, province: form.provincia, carrier: form.expreso.trim() };
}
