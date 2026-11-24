import type { CustomerType, Fulfillment, OrderStatus, PaymentStatus } from "@/lib/orders/types";

/** Every status in the order it usually moves through. */
export const orderStatuses: readonly OrderStatus[] = ["pending", "confirmed", "outForDelivery", "delivered", "cancelled"];

export const orderStatusLabel: Record<OrderStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  outForDelivery: "En reparto",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const fulfillmentLabel: Record<Fulfillment, string> = {
  delivery: "Envío en Moreno",
  pickup: "Retiro en el local",
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  unpaid: "Sin pagar",
  approved: "Pagado",
  rejected: "Rechazado",
  refunded: "Devuelto",
};

export const customerTypeLabel: Record<CustomerType, string> = {
  personal: "Personal",
  business: "Comercio",
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (orderStatuses as readonly string[]).includes(value);
}
