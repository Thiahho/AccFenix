/** Length of a phone once trimmed, and the digits it needs at least. Same rule as the API (`OrderLimits`). */
export const PHONE_MIN_LENGTH = 8;
export const PHONE_MAX_LENGTH = 20;
const PHONE_MIN_DIGITS = 8;

export const PHONE_MESSAGE = "Ingresá un teléfono válido, con código de área (ej.: 11 2233 4455)";

/**
 * A phone the shop can call to coordinate the order: once trimmed, 8 to 20 characters of digits, spaces, "+", "-",
 * "(" and ")", with at least 8 digits so punctuation alone never passes.
 */
export function isValidPhone(phone: string): boolean {
  const trimmed = phone.trim();
  return (
    trimmed.length >= PHONE_MIN_LENGTH &&
    trimmed.length <= PHONE_MAX_LENGTH &&
    /^[\d +()-]+$/.test(trimmed) &&
    (trimmed.match(/\d/g)?.length ?? 0) >= PHONE_MIN_DIGITS
  );
}
