import { describe, expect, it } from "vitest";
import { applyStatuses, CART_TTL_MS, isExpired, totalUnits, type CartItem } from "@/stores/cart";

const item = (variantId: number, qty = 1): CartItem => ({
  variantId,
  productSlug: "barral",
  productName: "Barral",
  categoryName: "Barrales",
  valuesLabel: "Medida 2.40",
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
      { id: 1, isActive: true, availability: "aPedido" },
      { id: 2, isActive: false, availability: "disponible" },
    ]);
    expect(result.map((i) => [i.variantId, i.availability])).toEqual([[1, "aPedido"]]);
  });

  it("sums units", () => {
    expect(totalUnits([item(1, 3), item(2, 120)])).toBe(123);
  });
});
