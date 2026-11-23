import { describe, expect, it } from "vitest";
import type { VariantStatus } from "@/lib/api";
import { applyStatuses, CART_TTL_MS, isExpired, totalUnits, type CartItem } from "@/stores/cart";

const item = (variantId: number, qty = 1): CartItem => ({
  variantId,
  productSlug: "huevos-n1",
  productName: "Huevos N°1",
  categoryName: "Huevos",
  valuesLabel: "Presentación Maple",
  availability: "disponible",
  qty,
});

describe("cart", () => {
  it("expires after the TTL", () => {
    const now = 1_000_000_000_000;
    expect(isExpired(now - CART_TTL_MS + 1, now)).toBe(false);
    expect(isExpired(now - CART_TTL_MS - 1, now)).toBe(true);
    expect(isExpired(0, now)).toBe(true);
  });

  it("drops inactive or unknown variants and refreshes availability", () => {
    const result = applyStatuses([item(1), item(2), item(3)], [
      { id: 1, isActive: true, availability: "aPedido", retailPrice: null},
      { id: 2, isActive: false, availability: "disponible", retailPrice: null},
    ]);
    expect(result.map((i) => [i.variantId, i.availability])).toEqual([[1, "aPedido"]]);
  });

  it("refreshes prices from the current variant data, replacing stale ones", () => {
    const stale = { ...item(1), retailPrice: 100};
    const result = applyStatuses([stale, item(2)], [
      { id: 1, isActive: true, availability: "disponible", retailPrice: 120},
      { id: 2, isActive: true, availability: "disponible", retailPrice: 55.5},
    ]);
    expect(result.map((i) => i.retailPrice)).toEqual([120, 55.5]);
  });

  it("clears prices when the variant data has none", () => {
    const stale = { ...item(1), retailPrice: 100};
    // Simulates an older API response without price fields.
    const statuses = [{ id: 1, isActive: true, availability: "disponible" }] as unknown as VariantStatus[];
    expect(applyStatuses([stale], statuses)[0]).toMatchObject({ retailPrice: null});
  });

  it("sums units", () => {
    expect(totalUnits([item(1, 3), item(2, 120)])).toBe(123);
  });
});
