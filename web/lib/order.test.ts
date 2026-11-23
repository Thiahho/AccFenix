import { describe, expect, it } from "vitest";
import { orderSchema } from "@/lib/order";

const base = { cliente: "personal", nombre: "  Ana  ", horario: "Hoy de 16 a 18 h" };

describe("orderSchema", () => {
  it("accepts a delivery order with an address", () => {
    const r = orderSchema.safeParse({ ...base, entrega: "envio", direccion: "Calle 123, 2B" });
    expect(r.success).toBe(true);
  });

  it("accepts a pickup order without an address", () => {
    expect(orderSchema.safeParse({ ...base, entrega: "retiro" }).success).toBe(true);
  });

  it("asks for a time slot in both cases", () => {
    const r = orderSchema.safeParse({ ...base, horario: "   ", entrega: "retiro" });
    expect(r.success).toBe(false);
  });

  it("does not accept an unknown delivery option or customer type", () => {
    expect(orderSchema.safeParse({ ...base, entrega: "correo" }).success).toBe(false);
    expect(orderSchema.safeParse({ ...base, cliente: "mayorista", entrega: "retiro" }).success).toBe(false);
  });
});
