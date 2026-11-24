import { fulfillmentLabel, isOrderStatus, paymentStatusLabel } from "@/lib/orders/status";
import type { Fulfillment, OrderStatus, PaymentStatus } from "@/lib/orders/types";
import { formatArs } from "@/lib/pricing";
import { DEFAULT_PAGE_SIZE, firstParam, MAX_SEARCH_LENGTH, parsePage, parsePageSize, type SortDir, type UrlParams } from "@/lib/admin/table";

export const ORDERS_PAGE_SIZE = DEFAULT_PAGE_SIZE;
export const orderSortKeys = ["date", "customer", "units", "total", "status"] as const;
export type OrderSort = (typeof orderSortKeys)[number];

export type OrdersQuery = {
  page: number;
  status?: OrderStatus;
  pageSize?: number;
  search?: string;
  payment?: PaymentStatus;
  fulfillment?: Fulfillment;
  sort?: OrderSort;
  dir?: SortDir;
};

const isKeyOf = <T extends string>(labels: Record<T, string>, value: string | undefined): value is T =>
  value !== undefined && Object.hasOwn(labels, value);

/** Reads the admin list URL (`?estado=pending&pagina=2&q=ana`), ignoring values that make no sense. */
export function parseOrdersQuery(params: UrlParams): OrdersQuery {
  const status = firstParam(params.estado);
  const payment = firstParam(params.pago);
  const fulfillment = firstParam(params.entrega);
  const sort = orderSortKeys.find((key) => key === firstParam(params.orden));
  const pageSize = parsePageSize(params.por);
  const search = (firstParam(params.q) ?? "").trim().slice(0, MAX_SEARCH_LENGTH);
  return {
    page: parsePage(params.pagina),
    status: isOrderStatus(status) ? status : undefined,
    pageSize: pageSize === DEFAULT_PAGE_SIZE ? undefined : pageSize,
    search: search || undefined,
    payment: isKeyOf(paymentStatusLabel, payment) ? payment : undefined,
    fulfillment: isKeyOf(fulfillmentLabel, fulfillment) ? fulfillment : undefined,
    sort,
    dir: sort ? (firstParam(params.dir) === "desc" ? "desc" : "asc") : undefined,
  };
}

export function ordersListPath({ page, status, pageSize, search, payment, fulfillment, sort, dir }: OrdersQuery) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize ?? ORDERS_PAGE_SIZE) });
  if (status) query.set("status", status);
  if (search) query.set("q", search);
  if (payment) query.set("payment", payment);
  if (fulfillment) query.set("fulfillment", fulfillment);
  if (sort) query.set("sort", sort);
  if (sort && dir) query.set("dir", dir);
  return `/api/admin/orders?${query}`;
}

export function ordersPageHref({ page, status, pageSize, search, payment, fulfillment, sort, dir }: OrdersQuery) {
  const query = new URLSearchParams();
  if (status) query.set("estado", status);
  if (page > 1) query.set("pagina", String(page));
  if (pageSize && pageSize !== DEFAULT_PAGE_SIZE) query.set("por", String(pageSize));
  if (search) query.set("q", search);
  if (payment) query.set("pago", payment);
  if (fulfillment) query.set("entrega", fulfillment);
  if (sort) query.set("orden", sort);
  if (sort && dir) query.set("dir", dir);
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
 * require a phone; some older ones have none. A local Argentine number gets the international mobile prefix (54 9). Best effort: a "15" written after the area code is not removed.
 */
export function whatsappChatHref(phone: string | null): string | null {
  let digits = (phone ?? "").replace(/\D/g, "").replace(/^00/, "");
  if (!digits.startsWith("54")) digits = `549${digits.replace(/^0/, "")}`;
  return digits.length >= 10 ? `https://wa.me/${digits}` : null;
}
