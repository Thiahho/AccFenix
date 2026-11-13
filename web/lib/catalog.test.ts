import { describe, expect, it } from "vitest";
import type { ProductAttribute, Variant } from "@/lib/api";
import { priceRows, splitProductName } from "@/lib/catalog";

describe("splitProductName", () => {
  it("splits the grade off for the board heading", () => {
    expect(splitProductName("Huevos N°1")).toEqual({ main: "Huevos", grade: "N°1" });
    expect(splitProductName("Huevos de color Nº 2")).toEqual({ main: "Huevos de color", grade: "Nº 2" });
  });

  it("keeps names without a grade whole", () => {
    expect(splitProductName(" Huevos de campo ")).toEqual({ main: "Huevos de campo", grade: null });
  });
});

describe("priceRows", () => {
  const attributes: ProductAttribute[] = [
    {
      id: 1,
      name: "Presentación",
      slug: "presentacion",
      values: [
        { id: 10, label: "Cajón", colorHex: null },
        { id: 11, label: "Medio cajón", colorHex: null },
        { id: 12, label: "Maple", colorHex: null },
      ],
    },
  ];
  const variant = (id: number, valueId: number, retailPrice: number | null): Variant => ({
    id,
    sku: `H1-${id}`,
    valueIds: [valueId],
    availability: "disponible",
    retailPrice,
    wholesalePrice: null,
  });

  it("orders rows like the attribute values and labels them with the value", () => {
    const rows = priceRows({ attributes, variants: [variant(3, 12, 6500), variant(1, 10, 60000), variant(2, 11, null)] });
    expect(rows.map((r) => r.label)).toEqual(["Cajón", "Medio cajón", "Maple"]);
    expect(rows.map((r) => r.retailPrice)).toEqual([60000, null, 6500]);
  });

  it("falls back to the SKU when a variant has no known values", () => {
    expect(priceRows({ attributes: [], variants: [variant(7, 99, 1)] })[0].label).toBe("H1-7");
  });
});
