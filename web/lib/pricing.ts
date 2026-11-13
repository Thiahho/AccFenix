// Pure pricing rules shared by the cart, the order view and the WhatsApp message.
// Prices are whole ARS pesos (no cents); a variant without a price is quoted on request.

/** The minimum a cart line needs to be priced. Missing prices mean "no price". */
export type PricedLine = { qty: number; retailPrice?: number | null; wholesalePrice?: number | null };

export type CartTotals = {
  /** Whether wholesale prices apply to the whole cart. */
  wholesale: boolean;
  /** Sum of the priced lines only. */
  total: number;
  pricedLines: number;
  /** True when at least one line has no price, so the total does not cover the whole cart. */
  partial: boolean;
};

/** Same upper bound the API enforces (numeric(12,2) capped at 8 integer digits). */
export const MAX_PRICE = 99_999_999.99;

const toCents = (amount: number) => Math.round(amount * 100);

/** A cart is wholesale when its total units reach the threshold; a threshold of 0 disables wholesale. */
export function isWholesale(items: { qty: number }[], threshold: number) {
  return threshold > 0 && items.reduce((sum, i) => sum + i.qty, 0) >= threshold;
}

/** Wholesale price when the cart is wholesale and the variant has one; otherwise retail; null when unpriced. */
export function unitPrice(line: PricedLine, wholesale: boolean): number | null {
  if (wholesale && line.wholesalePrice != null) return line.wholesalePrice;
  return line.retailPrice ?? null;
}

export function lineSubtotal(line: PricedLine, wholesale: boolean): number | null {
  const price = unitPrice(line, wholesale);
  return price === null ? null : (toCents(price) * line.qty) / 100;
}

export function cartTotals(items: PricedLine[], threshold: number): CartTotals {
  const wholesale = isWholesale(items, threshold);
  let cents = 0;
  let pricedLines = 0;
  for (const item of items) {
    const price = unitPrice(item, wholesale);
    if (price === null) continue;
    cents += toCents(price) * item.qty;
    pricedLines++;
  }
  return { wholesale, total: cents / 100, pricedLines, partial: pricedLines < items.length };
}

// Prices are handled in whole pesos: no cents are shown or accepted. Legacy values with cents are rounded on display.
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
