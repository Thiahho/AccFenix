import { describe, expect, it } from "vitest";
import type { OrderForm } from "@/lib/order";
import { buildOrderRequest } from "@/lib/orders/request";

const base = { nombre: " Ana Pérez ", telefono: " 11 2233 4455 ", horario: " Hoy 16 a 18 h " };

describe("buildOrderRequest", () => {
  it("sends the address for delivery and the personal customer type", () => {
    const form: OrderForm = { ...base, entrega: "envio", direccion: " Calle 123 " };
    expect(buildOrderRequest(form, [{ variantId: 7, qty: 2 }])).toEqual({
      fulfillment: "delivery",
      customerType: "personal",
      customerName: "Ana Pérez",
      phone: "11 2233 4455",
      timeSlot: "Hoy 16 a 18 h",
      address: "Calle 123",
      items: [{ variantId: 7, quantity: 2 }],
    });
  });

  it("leaves the address out for pickup and skips empty comments", () => {
    const form: OrderForm = { ...base, horario: "16:30", entrega: "retiro", comentarios: "   " };
    const body = buildOrderRequest(form, [{ variantId: 1, qty: 1 }]);
    expect(body.timeSlot).toBe("Hoy 16:30 h");
    expect(body).not.toHaveProperty("address");
    expect(body).not.toHaveProperty("comments");
    expect(body.fulfillment).toBe("pickup");
    expect(body.customerType).toBe("personal");
  });

  it("stays personal when a stale client still sends the removed choice", () => {
    const stale: OrderForm = { ...base, cliente: "comercio", entrega: "retiro" };
    expect(buildOrderRequest(stale, [{ variantId: 1, qty: 1 }]).customerType).toBe("personal");
  });
});
