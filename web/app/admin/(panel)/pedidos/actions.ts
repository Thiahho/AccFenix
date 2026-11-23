"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { adminFetch, AdminApiError } from "@/lib/admin/session";
import type { ActionResult } from "@/lib/admin/types";
import { isOrderStatus } from "@/lib/orders/status";
import type { OrderStatus } from "@/lib/orders/types";

/** Order ids are database identities: positive integers only. */
const isPositiveId = (id: number) => Number.isInteger(id) && id > 0;

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<ActionResult> {
  if (!isPositiveId(id) || !isOrderStatus(status)) return { ok: false, error: "Estado desconocido" };
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
