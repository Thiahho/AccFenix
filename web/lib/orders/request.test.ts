import { describe, expect, it } from "vitest";
import type { OrderForm } from "@/lib/order";
import { buildOrderRequest } from "@/lib/orders/request";

const base = { cliente: "comercio" as const, nombre: " Almacén Don Pepe ", horario: " Hoy 16 a 18 h " };

describe("buildOrderRequest", () => {
  it("sends the address for delivery and maps the customer type", () => {
    const form: OrderForm = { ...base, entrega: "envio", direccion: " Calle 123 " };
    expect(buildOrderRequest(form, [{ variantId: 7, qty: 2 }])).toEqual({
      fulfillment: "delivery",
      customerType: "business",
      customerName: "Almacén Don Pepe",
      timeSlot: "Hoy 16 a 18 h",
      address: "Calle 123",
      items: [{ variantId: 7, quantity: 2 }],
    });
  });

  it("leaves the address out for pickup and skips empty comments", () => {
    const form: OrderForm = { ...base, cliente: "personal", entrega: "retiro", comentarios: "   " };
    const body = buildOrderRequest(form, [{ variantId: 1, qty: 1 }]);
    expect(body).not.toHaveProperty("address");
    expect(body).not.toHaveProperty("comments");
    expect(body.fulfillment).toBe("pickup");
    expect(body.customerType).toBe("personal");
  });
});
