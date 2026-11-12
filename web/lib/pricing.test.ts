import { describe, expect, it } from "vitest";
import { cartTotals, formatArs, isWholesale, lineSubtotal, parsePriceInput, priceToInput, unitPrice } from "@/lib/pricing";

const line = (qty: number, retailPrice?: number | null, wholesalePrice?: number | null) => ({ qty, retailPrice, wholesalePrice });

describe("unitPrice", () => {
  it("uses the retail price for a retail cart", () => {
    expect(unitPrice(line(1, 1250.5, 990), false)).toBe(1250.5);
  });

  it("uses the wholesale price for a wholesale cart", () => {
    expect(unitPrice(line(1, 1250.5, 990), true)).toBe(990);
  });

  it("falls back to the retail price when there is no wholesale price", () => {
    expect(unitPrice(line(1, 1250.5, null), true)).toBe(1250.5);
    expect(unitPrice(line(1, 1250.5), true)).toBe(1250.5);
  });

  it("never applies the wholesale price to a retail cart", () => {
    expect(unitPrice(line(1, null, 990), false)).toBeNull();
  });

  it("is null when the variant has no price", () => {
    expect(unitPrice(line(1, null, null), false)).toBeNull();
    expect(unitPrice(line(1), true)).toBeNull();
  });

  it("treats zero as a real price", () => {
    expect(unitPrice(line(1, 0, null), false)).toBe(0);
    expect(unitPrice(line(1, 100, 0), true)).toBe(0);
  });
});

describe("lineSubtotal", () => {
  it("multiplies the unit price by the quantity without floating point drift", () => {
    expect(lineSubtotal(line(3, 1250.5), false)).toBe(3751.5);
    expect(lineSubtotal(line(3, 0.1), false)).toBe(0.3);
    expect(lineSubtotal(line(10, 1250.5, 990.99), true)).toBe(9909.9);
  });

  it("is null for an unpriced line", () => {
    expect(lineSubtotal(line(3, null), false)).toBeNull();
  });
});

describe("isWholesale", () => {
  it("is wholesale exactly at the threshold and above it", () => {
    expect(isWholesale([line(99)], 100)).toBe(false);
    expect(isWholesale([line(60), line(40)], 100)).toBe(true);
    expect(isWholesale([line(101)], 100)).toBe(true);
  });

  it("is never wholesale when the threshold is disabled", () => {
    expect(isWholesale([line(5000)], 0)).toBe(false);
  });
});

describe("cartTotals", () => {
  it("totals a retail cart with retail prices", () => {
    expect(cartTotals([line(2, 100, 80), line(1, 50.25, 40)], 100)).toEqual({
      wholesale: false,
      total: 250.25,
      pricedLines: 2,
      partial: false,
    });
  });

  it("switches to wholesale prices exactly at the threshold", () => {
    const below = cartTotals([line(99, 100, 80)], 100);
    expect(below).toMatchObject({ wholesale: false, total: 9900 });
    const at = cartTotals([line(100, 100, 80)], 100);
    expect(at).toMatchObject({ wholesale: true, total: 8000, partial: false });
  });

  it("mixes wholesale and retail fallback prices in a wholesale cart", () => {
    expect(cartTotals([line(100, 100, 80), line(1, 50, null)], 100)).toMatchObject({ wholesale: true, total: 8050, partial: false });
  });

  it("is partial when some lines have no price", () => {
    expect(cartTotals([line(2, 100), line(1, null)], 100)).toEqual({ wholesale: false, total: 200, pricedLines: 1, partial: true });
  });

  it("has no priced lines when nothing has a price", () => {
    expect(cartTotals([line(2), line(1, null, null)], 100)).toEqual({ wholesale: false, total: 0, pricedLines: 0, partial: true });
  });

  it("is zero and complete for an empty cart", () => {
    expect(cartTotals([], 100)).toEqual({ wholesale: false, total: 0, pricedLines: 0, partial: false });
  });
});

describe("formatArs", () => {
  it("formats pesos the es-AR way with a plain space", () => {
    expect(formatArs(1250.5)).toBe("$ 1.250,50");
    expect(formatArs(0)).toBe("$ 0,00");
    expect(formatArs(999)).toBe("$ 999,00");
    expect(formatArs(99999999.99)).toBe("$ 99.999.999,99");
  });
});

describe("parsePriceInput", () => {
  it("treats an empty input as no price", () => {
    expect(parsePriceInput("")).toEqual({ ok: true, value: null });
    expect(parsePriceInput("   ")).toEqual({ ok: true, value: null });
  });

  it("accepts comma or dot decimals with up to two digits", () => {
    expect(parsePriceInput("1250,50")).toEqual({ ok: true, value: 1250.5 });
    expect(parsePriceInput(" 1250.5 ")).toEqual({ ok: true, value: 1250.5 });
    expect(parsePriceInput("0")).toEqual({ ok: true, value: 0 });
    expect(parsePriceInput("99999999,99")).toEqual({ ok: true, value: 99999999.99 });
  });

  it("rejects negatives, more than two decimals, values above the limit and non-numbers", () => {
    for (const raw of ["-1", "1,234", "100000000", "abc", "1.250,50", "1e3", ","]) {
      expect(parsePriceInput(raw).ok, raw).toBe(false);
    }
  });
});

describe("priceToInput", () => {
  it("renders a stored price the way it is typed", () => {
    expect(priceToInput(null)).toBe("");
    expect(priceToInput(1250.5)).toBe("1250,5");
    expect(priceToInput(80)).toBe("80");
  });

  it("round-trips through parsePriceInput", () => {
    expect(parsePriceInput(priceToInput(1250.55))).toEqual({ ok: true, value: 1250.55 });
  });
});
