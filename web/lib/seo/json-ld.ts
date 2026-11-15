/*
 * JSON-LD is embedded raw inside <script type="application/ld+json">, so values coming from the API must not be able
 * to close the tag or start an HTML comment. Escaping `<`, `>` and `&` as JSON unicode escapes keeps the payload valid
 * JSON while making `</script>` impossible; the line/paragraph separators (U+2028, U+2029) are escaped too.
 *
 * Every replacement is built from char codes on purpose: a single-backslash u003c escape in source is `<` itself, which is exactly
 * the bug this helper replaced.
 */
const ESCAPED_CODES = [0x3c, 0x3e, 0x26, 0x2028, 0x2029];

const BACKSLASH = String.fromCharCode(0x5c);
const escapeFor = (code: number) => BACKSLASH + "u" + code.toString(16).padStart(4, "0");
const ESCAPES = new Map(ESCAPED_CODES.map((code) => [String.fromCharCode(code), escapeFor(code)]));
const PATTERN = new RegExp(`[${ESCAPED_CODES.map((code) => String.fromCharCode(code)).join("")}]`, "g");

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(PATTERN, (char) => ESCAPES.get(char) ?? char);
}
