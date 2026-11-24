import { describe, expect, it } from "vitest";
import { orderSchema } from "@/lib/order";
import { PHONE_MESSAGE } from "@/lib/phone";

const base = { nombre: "  Ana  ", telefono: "11 2233 4455", horario: "Hoy de 16 a 18 h" };

describe("orderSchema", () => {
  it("accepts a delivery order with an address", () => {
    const r = orderSchema.safeParse({ ...base, entrega: "envio", direccion: "Calle 123, 2B" });
    expect(r.success).toBe(true);
  });

  it("accepts a pickup order without an address", () => {
    expect(orderSchema.safeParse({ ...base, horario: "16:30", entrega: "retiro" }).success).toBe(true);
  });

  it("asks for a time slot in both cases", () => {
    const r = orderSchema.safeParse({ ...base, horario: "   ", entrega: "retiro" });
    expect(r.success).toBe(false);
  });

  it("asks pickup for an hour, not free text", () => {
    expect(orderSchema.safeParse({ ...base, entrega: "retiro" }).success).toBe(false);
  });

  it("does not accept an unknown delivery option", () => {
    expect(orderSchema.safeParse({ ...base, entrega: "correo" }).success).toBe(false);
  });

  it("drops a customer type sent by an older checkout", () => {
    const r = orderSchema.safeParse({ ...base, horario: "16:30", cliente: "mayorista", entrega: "retiro" });
    expect(r.success).toBe(true);
    expect(r.data).not.toHaveProperty("cliente");
  });

  it("requires a valid phone", () => {
    const order = { ...base, entrega: "envio", direccion: "Calle 123" };
    for (const telefono of [undefined, "", "abc", "123", "1".repeat(21)]) {
      expect(orderSchema.safeParse({ ...order, telefono }).success, String(telefono)).toBe(false);
    }
  });

  it("explains a wrong phone in Spanish and trims a valid one", () => {
    const order = { ...base, entrega: "envio", direccion: "Calle 123" };
    const bad = orderSchema.safeParse({ ...order, telefono: "abc" });
    expect(bad.error?.issues.find((i) => i.path[0] === "telefono")?.message).toBe(PHONE_MESSAGE);
    const ok = orderSchema.safeParse({ ...order, telefono: "  +54 9 (11) 2233-4455  " });
    expect(ok.data?.telefono).toBe("+54 9 (11) 2233-4455");
  });
});
