import { describe, expect, it } from "vitest";
import { parseQty, unitsLabel } from "./qty";

describe("unitsLabel", () => {
  it("uses the singular only for one unit", () => {
    expect(unitsLabel(1)).toBe("1 unidad");
    expect(unitsLabel(2)).toBe("2 unidades");
    expect(unitsLabel(0)).toBe("0 unidades");
  });
});

describe("parseQty", () => {
  it("acepta números enteros dentro del rango", () => {
    expect(parseQty("5", 100)).toBe(5);
    expect(parseQty(" 12 ", 100)).toBe(12);
  });

  it("no confirma un campo vacío ni un cero, para poder borrar y reescribir", () => {
    expect(parseQty("", 100)).toBeNull();
    expect(parseQty("0", 100)).toBeNull();
  });

  it("rechaza lo que no es un entero positivo", () => {
    expect(parseQty("-3", 100)).toBeNull();
    expect(parseQty("2.5", 100)).toBeNull();
    expect(parseQty("abc", 100)).toBeNull();
  });

  it("recorta al máximo", () => {
    expect(parseQty("250", 100)).toBe(100);
  });
});
