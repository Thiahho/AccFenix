"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { locationFieldErrors, type LocationField } from "@/lib/admin/orders";
import { adminFetch, AdminApiError } from "@/lib/admin/session";
import type { ActionResult } from "@/lib/admin/types";
import { isOrderStatus } from "@/lib/orders/status";
import type { OrderStatus } from "@/lib/orders/types";

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<ActionResult> {
  if (!Number.isInteger(id) || !isOrderStatus(status)) return { ok: false, error: "Estado desconocido" };
  try {
    await adminFetch(`/api/admin/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    revalidatePath("/admin/pedidos", "layout");
    return { ok: true };
  } catch (e) {
    unstable_rethrow(e); // lets the expired-session redirect() through
    if (e instanceof AdminApiError) return { ok: false, error: e.status === 404 ? "El pedido ya no existe" : e.message };
    console.error(e);
    return { ok: false, error: "No se pudo conectar con la API" };
  }
}

export type OrderLocationInput = { locality: string; address: string; latitude: number | null; longitude: number | null };

export type OrderLocationResult = { ok: true } | { ok: false; error: string; fieldErrors: Partial<Record<LocationField, string>> };

/** Changes the delivery location of an own-delivery order; without coordinates the map point is removed. */
export async function updateOrderLocation(id: number, input: OrderLocationInput): Promise<OrderLocationResult> {
  if (!Number.isInteger(id)) return { ok: false, error: "El pedido ya no existe", fieldErrors: {} };
  const body = {
    locality: input.locality.trim(),
    address: input.address.trim(),
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
  };
  try {
    await adminFetch(`/api/admin/orders/${id}/location`, { method: "PATCH", body: JSON.stringify(body) });
    // The layout scope covers the detail page and the list (route builder and "Ver en Maps").
    revalidatePath("/admin/pedidos", "layout");
    return { ok: true };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof AdminApiError) {
      const error = e.status === 404 ? "El pedido ya no existe" : e.message;
      return { ok: false, error, fieldErrors: e.status === 400 ? locationFieldErrors(e.problem.errors) : {} };
    }
    console.error(e);
    return { ok: false, error: "No se pudo conectar con la API", fieldErrors: {} };
  }
}
