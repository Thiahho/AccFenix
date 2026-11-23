import { describe, expect, it } from "vitest";
import { cartTotals, formatArs, lineSubtotal, parsePriceInput, priceFromText, priceToInput, unitPrice } from "@/lib/pricing";

describe("priceFromText", () => {
  it("shows the plain price when every size costs the same", () => {
    expect(priceFromText([1000, 1000])).toBe(formatArs(1000));
    expect(priceFromText([4500])).toBe(formatArs(4500));
  });

  it("shows the lowest price as a starting price when sizes differ", () => {
    expect(priceFromText([6000, 4500])).toBe(`Desde ${formatArs(4500)}`);
  });

  it("counts an unpriced size as a difference", () => {
    expect(priceFromText([null, 4500])).toBe(`Desde ${formatArs(4500)}`);
  });

  it("asks to consult when nothing is priced", () => {
    expect(priceFromText([null, null])).toBe("Consultar");
    expect(priceFromText([])).toBe("Consultar");
  });
});

describe("unitPrice and lineSubtotal", () => {
  it("uses the retail price, or null when the line has none", () => {
    expect(unitPrice({ qty: 1, retailPrice: 4500 })).toBe(4500);
    expect(unitPrice({ qty: 1, retailPrice: null })).toBeNull();
    expect(lineSubtotal({ qty: 1, retailPrice: null })).toBeNull();
  });

  it("multiplies the price by the quantity", () => {
    expect(lineSubtotal({ qty: 3, retailPrice: 4500 })).toBe(13500);
  });

  it("treats zero as a real price", () => {
    expect(unitPrice({ qty: 1, retailPrice: 0 })).toBe(0);
  });
});

describe("cartTotals", () => {
  it("totals a fully priced cart", () => {
    expect(cartTotals([{ qty: 2, retailPrice: 4500 }, { qty: 1, retailPrice: 7500 }])).toEqual({
      total: 16500,
      pricedLines: 2,
      partial: false,
    });
  });

  it("is partial when some lines have no price", () => {
    expect(cartTotals([{ qty: 1, retailPrice: 4500 }, { qty: 1, retailPrice: null }])).toEqual({
      total: 4500,
      pricedLines: 1,
      partial: true,
    });
  });

  it("is zero, complete and without priced lines for an empty cart", () => {
    expect(cartTotals([])).toEqual({ total: 0, pricedLines: 0, partial: false });
  });
});

describe("formatArs", () => {
  it("formats whole pesos with dots and a plain space", () => {
    expect(formatArs(60000)).toBe("$ 60.000");
  });
});

describe("parsePriceInput", () => {
  it("accepts plain or dotted whole pesos and empty as no price", () => {
    expect(parsePriceInput("60000")).toEqual({ ok: true, value: 60000 });
    expect(parsePriceInput("60.000")).toEqual({ ok: true, value: 60000 });
    expect(parsePriceInput("  ")).toEqual({ ok: true, value: null });
  });

  it("rejects cents and more than 8 digits", () => {
    expect(parsePriceInput("60,50").ok).toBe(false);
    expect(parsePriceInput("123456789").ok).toBe(false);
  });

  it("prints a price back for the admin input", () => {
    expect(priceToInput(60000)).toBe("60.000");
    expect(priceToInput(null)).toBe("");
  });
});
