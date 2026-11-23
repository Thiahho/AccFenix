import { describe, expect, it } from "vitest";
import type { ProductAttribute, Variant } from "@/lib/api";
import { describeSelection, findVariant, initialSelection, isValueEnabled, select } from "@/lib/variants";

// Presentación (1: Maple, 2: Medio cajón) × Calibre (10: N°1, 11: N°2). The Medio cajón/N°2 combination is missing.
const attributes: ProductAttribute[] = [
  { id: 1, name: "Presentación", slug: "presentacion", values: [{ id: 1, label: "Maple", colorHex: null }, { id: 2, label: "Medio cajón", colorHex: null }] },
  { id: 2, name: "Calibre", slug: "calibre", values: [{ id: 10, label: "N°1", colorHex: null }, { id: 11, label: "N°2", colorHex: null }] },
];
const variants: Variant[] = [
  { id: 100, sku: "a", valueIds: [1, 10], availability: "disponible", retailPrice: null},
  { id: 101, sku: "b", valueIds: [1, 11], availability: "aPedido", retailPrice: null},
  { id: 102, sku: "c", valueIds: [2, 10], availability: "disponible", retailPrice: null},
];

describe("variants", () => {
  it("finds the variant only when every attribute is selected", () => {
    expect(findVariant(attributes, variants, { 1: 1 })).toBeUndefined();
    expect(findVariant(attributes, variants, { 1: 1, 2: 11 })?.id).toBe(101);
  });

  it("disables values without a matching combination", () => {
    expect(isValueEnabled(variants, { 1: 2 }, 2, 11)).toBe(false);
    expect(isValueEnabled(variants, { 1: 2 }, 2, 10)).toBe(true);
    expect(isValueEnabled(variants, {}, 2, 11)).toBe(true);
  });

  it("clears incompatible choices when switching a value", () => {
    expect(select(attributes, variants, { 1: 1, 2: 11 }, 1, 2)).toEqual({ 1: 2, 2: undefined });
  });

  it("preselects attributes with a single value", () => {
    const single = [{ ...attributes[0], values: [attributes[0].values[0]] }, attributes[1]];
    expect(initialSelection(single)).toEqual({ 1: 1 });
  });

  it("describes the selection", () => {
    expect(describeSelection(attributes, { 1: 2, 2: 10 })).toBe("Presentación Medio cajón · Calibre N°1");
  });
});
