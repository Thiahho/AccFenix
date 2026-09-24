import { describe, expect, it } from "vitest";
import type { ProductAttribute, Variant } from "@/lib/api";
import { describeSelection, findVariant, initialSelection, isValueEnabled, select } from "@/lib/variants";

// Medida (1: 1.20, 2: 1.40) × Grosor (10: 22, 11: 34). Falta la combinación 1.40/34.
const attributes: ProductAttribute[] = [
  { id: 1, name: "Medida", slug: "medida", values: [{ id: 1, label: "1.20", colorHex: null }, { id: 2, label: "1.40", colorHex: null }] },
  { id: 2, name: "Grosor", slug: "grosor", values: [{ id: 10, label: "22", colorHex: null }, { id: 11, label: "34", colorHex: null }] },
];
const variants: Variant[] = [
  { id: 100, sku: "a", valueIds: [1, 10], availability: "disponible" },
  { id: 101, sku: "b", valueIds: [1, 11], availability: "aPedido" },
  { id: 102, sku: "c", valueIds: [2, 10], availability: "disponible" },
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
    expect(describeSelection(attributes, { 1: 2, 2: 10 })).toBe("Medida 1.40 · Grosor 22");
  });
});
