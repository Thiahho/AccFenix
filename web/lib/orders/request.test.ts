import { describe, expect, it } from "vitest";
import type { OrderForm } from "@/lib/order";
import { buildOrderRequest } from "@/lib/orders/request";

const lines = [
  { variantId: 7, qty: 2 },
  { variantId: 9, qty: 120 },
];

describe("buildOrderRequest", () => {
  it("maps a Buenos Aires order without fields of the other zone", () => {
    const form: OrderForm = { zona: "buenos-aires", nombre: " Ana ", telefono: "11 5555", localidad: "Quilmes", direccion: "Calle 123", comentarios: "" };
    const request = buildOrderRequest(form, lines);
    expect(request).toEqual({
      zone: "buenosAires",
      customerName: "Ana",
      phone: "11 5555",
      locality: "Quilmes",
      address: "Calle 123",
      items: [
        { variantId: 7, quantity: 2 },
        { variantId: 9, quantity: 120 },
      ],
    });
    expect(request).not.toHaveProperty("province");
    expect(request).not.toHaveProperty("carrier");
    expect(request).not.toHaveProperty("comments");
  });

  it("sends both coordinates when a location was captured", () => {
    const form: OrderForm = { zona: "buenos-aires", nombre: "Ana", telefono: "11", localidad: "Q", direccion: "C 1", ubicacion: { lat: -34.6, lng: -58.8 } };
    const request = buildOrderRequest(form, lines);
    expect(request.latitude).toBe(-34.6);
    expect(request.longitude).toBe(-58.8);
  });

  it("maps another province with carrier and trimmed comments", () => {
    const form: OrderForm = { zona: "otra-provincia", nombre: "Juan", telefono: "351", provincia: "Córdoba", expreso: "Vía Cargo", comentarios: "  Por la tarde " };
    const request = buildOrderRequest(form, lines);
    expect(request).toEqual({
      zone: "otherProvince",
      customerName: "Juan",
      phone: "351",
      province: "Córdoba",
      carrier: "Vía Cargo",
      comments: "Por la tarde",
      items: [
        { variantId: 7, quantity: 2 },
        { variantId: 9, quantity: 120 },
      ],
    });
    expect(request).not.toHaveProperty("locality");
    expect(request).not.toHaveProperty("latitude");
  });

  it("never sends prices", () => {
    const form: OrderForm = { zona: "otra-provincia", nombre: "Juan", telefono: "351", provincia: "Córdoba", expreso: "X" };
    const priced = [{ variantId: 1, qty: 3, retailPrice: 10, wholesalePrice: 8 }];
    expect(JSON.stringify(buildOrderRequest(form, priced))).not.toMatch(/price/i);
  });
});
