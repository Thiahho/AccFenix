// Pure pricing rules shared by the cart, the order view and the WhatsApp message.
// Prices are ARS with at most 2 decimals; a variant without a price is quoted on request.

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

const arsNumber = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });

/** "$ 1.250,50". Uses a plain space so the text is safe to paste into a WhatsApp message. */
export function formatArs(amount: number) {
  return `$ ${arsNumber.format(amount)}`;
}

export type PriceInput = { ok: true; value: number | null } | { ok: false; error: string };

/** Parses a price typed by the admin. Empty means no price; the rule mirrors the API validation. */
export function parsePriceInput(raw: string): PriceInput {
  const text = raw.trim();
  if (text === "") return { ok: true, value: null };
  // Up to 8 integer digits and 2 decimals keeps the value within 0..MAX_PRICE.
  if (!/^\d{1,8}([.,]\d{1,2})?$/.test(text)) {
    return { ok: false, error: "Ingresá un precio entre 0 y 99.999.999,99 con hasta 2 decimales" };
  }
  return { ok: true, value: Number(text.replace(",", ".")) };
}

/** Text for a price input: empty when there is no price, comma as decimal separator. */
export function priceToInput(price: number | null | undefined) {
  return price == null ? "" : String(price).replace(".", ",");
}
