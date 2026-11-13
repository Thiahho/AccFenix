/**
 * Reads what the user typed in a quantity field. Returns null while the text is not a usable quantity (empty, zero,
 * not a whole number), so the field can be cleared and retyped without snapping back to 1.
 */
export function parseQty(text: string, max: number): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const qty = Number(trimmed);
  return qty >= 1 ? Math.min(max, qty) : null;
}
