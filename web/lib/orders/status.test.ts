import { describe, expect, it } from "vitest";
import { isOrderStatus, orderStatuses, orderStatusLabel, zoneLabel } from "@/lib/orders/status";

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

  it("labels delivery zones", () => {
    expect(zoneLabel.buenosAires).toBe("Buenos Aires");
    expect(zoneLabel.otherProvince).toBe("Otra provincia");
  });
});
