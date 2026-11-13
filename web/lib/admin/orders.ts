import { isOrderStatus } from "@/lib/orders/status";
import type { OrderStatus } from "@/lib/orders/types";
import { formatArs } from "@/lib/pricing";

export const ORDERS_PAGE_SIZE = 20;

export type OrdersQuery = { page: number; status?: OrderStatus };

/** Reads the admin list URL (`?estado=pending&pagina=2`), ignoring values that make no sense. */
export function parseOrdersQuery(params: { pagina?: string; estado?: string }): OrdersQuery {
  const page = Number(params.pagina);
  return { page: Number.isInteger(page) && page >= 1 ? page : 1, status: isOrderStatus(params.estado) ? params.estado : undefined };
}

export function ordersListPath({ page, status }: OrdersQuery) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(ORDERS_PAGE_SIZE) });
  if (status) query.set("status", status);
  return `/api/admin/orders?${query}`;
}

export function ordersPageHref({ page, status }: OrdersQuery) {
  const query = new URLSearchParams();
  if (status) query.set("estado", status);
  if (page > 1) query.set("pagina", String(page));
  const qs = query.toString();
  return qs ? `/admin/pedidos?${qs}` : "/admin/pedidos";
}

export function pageCount(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Order total for the panel: "Consultar" when nothing is priced, and a marker when some lines are unpriced. */
export function orderTotalLabel({ total, hasUnpricedItems }: { total: number; hasUnpricedItems: boolean }) {
  if (hasUnpricedItems && total === 0) return "Consultar";
  return hasUnpricedItems ? `${formatArs(total)} + a consultar` : formatArs(total);
}

const dateParts = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "13/11/2026 12:05" in Buenos Aires time, whatever the server time zone is. */
export function formatOrderDate(iso: string) {
  const parts = Object.fromEntries(dateParts.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

/**
 * WhatsApp chat link for the phone a customer left on an order, or null when there is none. Orders placed from the site
 * no longer carry a phone (they arrive from the customer's WhatsApp); older ones may hold a local Argentine number,
 * which gets the international mobile prefix (54 9). Best effort: a "15" written after the area code is not removed.
 */
export function whatsappChatHref(phone: string | null): string | null {
  let digits = (phone ?? "").replace(/\D/g, "").replace(/^00/, "");
  if (!digits.startsWith("54")) digits = `549${digits.replace(/^0/, "")}`;
  return digits.length >= 10 ? `https://wa.me/${digits}` : null;
}
