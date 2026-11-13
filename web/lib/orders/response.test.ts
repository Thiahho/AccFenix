import { describe, expect, it } from "vitest";
import { interpretOrderResponse, unavailableResult } from "@/lib/orders/response";
import type { CreatedOrder } from "@/lib/orders/types";

const created: CreatedOrder = {
  id: 5,
  number: 123,
  status: "pending",
  createdAt: "2026-11-13T12:00:00Z",
  isWholesale: false,
  total: 2000,
  hasUnpricedItems: false,
  items: [{ id: 1, variantId: 7, productName: "Huevos N°1", sku: "H1-MAPLE", variantLabel: "Maple", quantity: 2, unitPrice: 1000, subtotal: 2000 }],
};

describe("interpretOrderResponse", () => {
  it("returns the created order on 201", () => {
    expect(interpretOrderResponse(201, created)).toEqual({ ok: true, order: created });
  });

  it("maps validator keys to form fields", () => {
    const result = interpretOrderResponse(400, { errors: { CustomerName: ["Hasta 120 caracteres"], Phone: ["Hasta 40 caracteres"], Carrier: ["Hasta 200 caracteres"] } });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("invalid");
    expect(result.fieldErrors).toEqual({ nombre: "Hasta 120 caracteres", telefono: "Hasta 40 caracteres", expreso: "Hasta 200 caracteres" });
    expect(result.error).toBe("Revisá los datos marcados.");
  });

  it("maps customer type and business name errors to their fields", () => {
    const result = interpretOrderResponse(400, { errors: { CustomerType: ["Elegí el tipo de cliente"], BusinessName: ["Completá el nombre del comercio"] } });
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors).toEqual({ cliente: "Elegí el tipo de cliente", comercio: "Completá el nombre del comercio" });
  });

  it("replaces default English validator messages with Spanish copy", () => {
    const result = interpretOrderResponse(400, { errors: { Locality: ["'Locality' must not be empty."] } });
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors.localidad).toBe("Revisá este dato");
  });

  it("shows item problems as a general error", () => {
    const result = interpretOrderResponse(400, { errors: { items: ["Hay productos que ya no están disponibles"] } });
    if (result.ok) throw new Error("expected failure");
    expect(result.fieldErrors).toEqual({});
    expect(result.error).toBe("Hay productos que ya no están disponibles");
  });

  it("uses a Spanish message for indexed item errors", () => {
    const result = interpretOrderResponse(400, { errors: { "Items[0].Quantity": ["'Quantity' must be between 1 and 99999."] } });
    if (result.ok) throw new Error("expected failure");
    expect(result.error).toBe("Revisá las cantidades de tu pedido.");
  });

  it("explains a 400 without field errors", () => {
    const result = interpretOrderResponse(400, { title: "Bad Request" });
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("invalid");
    expect(result.error).toMatch(/no pudimos procesar/i);
  });

  it("asks to wait when rate limited", () => {
    const result = interpretOrderResponse(429, null);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("rateLimited");
    expect(result.error).toMatch(/demasiados pedidos/i);
    expect(result.error).toMatch(/minutos/);
  });

  it("treats server errors as unavailable", () => {
    const result = interpretOrderResponse(503, {});
    expect(result).toEqual(unavailableResult());
    expect(unavailableResult().ok).toBe(false);
  });
});
