import { describe, expect, it } from "vitest";
import { orderSchema } from "@/lib/order";

const ba = { zona: "buenos-aires", nombre: "Ana", telefono: "11 5555-5555", localidad: "Quilmes", direccion: "Calle 123" };
const interior = { zona: "otra-provincia", nombre: "Juan", telefono: "351 444", provincia: "Córdoba", expreso: "Vía Cargo" };

const ok = (input: unknown) => orderSchema.safeParse(input).success;

describe("orderSchema", () => {
  it("accepts a complete order for each zone", () => {
    expect(ok(ba)).toBe(true);
    expect(ok(interior)).toBe(true);
  });

  it("trims text and treats blank fields as missing", () => {
    expect(orderSchema.parse({ ...ba, nombre: "  Ana  " }).nombre).toBe("Ana");
    expect(ok({ ...ba, nombre: "   " })).toBe(false);
    expect(ok({ ...ba, direccion: "" })).toBe(false);
    expect(ok({ ...interior, expreso: undefined })).toBe(false);
  });

  it("rejects text longer than each field allows", () => {
    expect(ok({ ...ba, nombre: "a".repeat(121) })).toBe(false);
    expect(ok({ ...ba, telefono: "1".repeat(41) })).toBe(false);
    expect(ok({ ...ba, direccion: "a".repeat(201) })).toBe(false);
    expect(ok({ ...ba, comentarios: "a".repeat(501) })).toBe(false);
    expect(ok({ ...ba, comentarios: "a".repeat(500) })).toBe(true);
  });

  it("only accepts known zones and provinces", () => {
    expect(ok({ ...ba, zona: "exterior" })).toBe(false);
    expect(ok({ ...interior, provincia: "Atlántida" })).toBe(false);
    expect(ok({ ...interior, provincia: "'; DROP TABLE pedidos; --" })).toBe(false);
  });

  it("rejects coordinates outside the valid range or of the wrong type", () => {
    expect(ok({ ...ba, ubicacion: { lat: -34.6, lng: -58.4 } })).toBe(true);
    expect(ok({ ...ba, ubicacion: { lat: -91, lng: -58.4 } })).toBe(false);
    expect(ok({ ...ba, ubicacion: { lat: -34.6, lng: 181 } })).toBe(false);
    expect(ok({ ...ba, ubicacion: { lat: "-34.6", lng: "-58.4" } })).toBe(false);
  });
});
