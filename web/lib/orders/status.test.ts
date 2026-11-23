import { describe, expect, it } from "vitest";
import { customerTypeLabel, isOrderStatus, orderStatuses, orderStatusLabel, fulfillmentLabel, paymentStatusLabel } from "@/lib/orders/status";

describe("order statuses", () => {
  it("lists the five statuses in workflow order with Spanish labels", () => {
    expect(orderStatuses).toEqual(["pending", "confirmed", "outForDelivery", "delivered", "cancelled"]);
    expect(orderStatuses.map((s) => orderStatusLabel[s])).toEqual(["Pendiente", "Confirmado", "En reparto", "Entregado", "Cancelado"]);
  });

  it("recognizes only known statuses", () => {
    expect(isOrderStatus("outForDelivery")).toBe(true);
    expect(isOrderStatus("shipped")).toBe(false);
    expect(isOrderStatus(undefined)).toBe(false);
  });

  it("labels the fulfillment and the payment state", () => {
    expect(fulfillmentLabel.delivery).toBe("Envío en Moreno");
    expect(fulfillmentLabel.pickup).toBe("Retiro en el local");
    expect(paymentStatusLabel.approved).toBe("Pagado");
  });

  it("labels customer types", () => {
    expect(customerTypeLabel.personal).toBe("Personal");
    expect(customerTypeLabel.business).toBe("Comercio");
  });
});
