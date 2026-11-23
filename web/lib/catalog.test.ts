import { describe, expect, it } from "vitest";
import type { ProductAttribute, Variant } from "@/lib/api";
import { priceRowCartItem, priceRows, splitProductName } from "@/lib/catalog";

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

describe("priceRowCartItem", () => {
  const product = {
    name: "Huevos N°1",
    slug: "huevos-n1",
    category: { name: "Huevos", slug: "huevos" },
    attributes: [
      {
        id: 1,
        name: "Presentación",
        slug: "presentacion",
        values: [
          { id: 10, label: "Cajón", colorHex: null },
          { id: 12, label: "Maple", colorHex: null },
        ],
      },
    ],
    variants: [
      { id: 5, sku: "H1-C", valueIds: [10], availability: "disponible", retailPrice: 60000},
      { id: 6, sku: "H1-M", valueIds: [12], availability: "aPedido", retailPrice: null},
    ] satisfies Variant[],
  };

  it("builds the same cart item the product card adds", () => {
    expect(priceRowCartItem(product, 5)).toEqual({
      variantId: 5,
      productSlug: "huevos-n1",
      productName: "Huevos N°1",
      categoryName: "Huevos",
      valuesLabel: "Presentación Cajón",
      availability: "disponible",
      retailPrice: 60000,
    });
  });

  it("keeps on-request variants addable without a price", () => {
    expect(priceRowCartItem(product, 6)).toMatchObject({ variantId: 6, valuesLabel: "Presentación Maple", availability: "aPedido", retailPrice: null });
  });

  it("returns null for an unknown variant", () => {
    expect(priceRowCartItem(product, 99)).toBeNull();
  });
});
