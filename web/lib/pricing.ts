// Pure pricing rules shared by the cart, the order view and the WhatsApp message.
// Prices are whole ARS pesos (no cents); a variant without a price is quoted on request.

/** The minimum a cart line needs to be priced. Missing prices mean "no price". */
export type PricedLine = { qty: number; retailPrice?: number | null; addons?: { price: number }[] };

export type CartTotals = {
  /** Sum of the priced lines only. */
  total: number;
  pricedLines: number;
  /** True when at least one line has no price, so the total does not cover the whole cart. */
  partial: boolean;
};

/** Same upper bound the API enforces, in whole pesos. */
export const MAX_PRICE = 99_999_999;

export function unitPrice(line: PricedLine): number | null {
  if (line.retailPrice == null) return null;
  return line.retailPrice + (line.addons ?? []).reduce((sum, addon) => sum + addon.price, 0);
}

export function lineSubtotal(line: PricedLine): number | null {
  const price = unitPrice(line);
  return price === null ? null : price * line.qty;
}

export function cartTotals(items: PricedLine[]): CartTotals {
  let total = 0;
  let pricedLines = 0;
  for (const item of items) {
    const price = unitPrice(item);
    if (price === null) continue;
    total += price * item.qty;
    pricedLines++;
  }
  return { total, pricedLines, partial: pricedLines < items.length };
}

// Prices are whole pesos: no cents are shown or accepted.
const arsNumber = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0, useGrouping: "always" });

/** "$ 60.000". Uses a plain space so the text is safe to paste into a WhatsApp message. */
export function formatArs(amount: number) {
  return `$ ${arsNumber.format(amount)}`;
}

export type PriceInput = { ok: true; value: number | null } | { ok: false; error: string };

/**
 * Parses a price typed by the admin, in whole pesos. Thousands dots are optional ("60000" or "60.000").
 * Empty means no price. Up to 8 digits keeps the value within the API limit.
 */
export function parsePriceInput(raw: string): PriceInput {
  const text = raw.trim();
  if (text === "") return { ok: true, value: null };
  const digits = /^\d+$/.test(text) ? text : /^\d{1,3}(\.\d{3})+$/.test(text) ? text.replaceAll(".", "") : null;
  if (digits === null || digits.length > 8) {
    return { ok: false, error: "Ingresá un precio en pesos, sin centavos (ej: 60000)" };
  }
  return { ok: true, value: Number(digits) };
}

/** Text for a price input: empty when there is no price, whole pesos with thousands dots. */
export function priceToInput(price: number | null | undefined) {
  return price == null ? "" : arsNumber.format(price);
}

/** Price of a product with several sizes: the plain price, "Desde" the lowest when they differ, or "Consultar". */
export function priceFromText(prices: (number | null)[]): string {
  const priced = prices.filter((p): p is number => p !== null);
  if (priced.length === 0) return "Consultar";
  const lowest = Math.min(...priced);
  const same = priced.length === prices.length && priced.every((p) => p === lowest);
  return same ? formatArs(lowest) : `Desde ${formatArs(lowest)}`;
}
