import { describe, expect, it } from "vitest";
import { isValidPhone, PHONE_MESSAGE } from "@/lib/phone";

describe("isValidPhone", () => {
  it.each(["11 2233 4455", "+54 9 (11) 2233-4455", "11223344", "011-2233-4455", "  11 2233 4455  ", "12345678901234567890"])(
    "accepts %j",
    (phone) => expect(isValidPhone(phone)).toBe(true),
  );

  it.each([
    ["empty", ""],
    ["blank", "    "],
    ["letters", "abc"],
    ["too short", "123"],
    ["seven digits", "(11) 555-00"],
    ["too long", "123456789012345678901"],
    ["a letter among digits", "11 5555-000a"],
    ["a line break", "11\n55550000"],
    ["quotes", "1' OR '1'='1"],
    ["only punctuation", "+-() +-() +-()"],
  ])("rejects %s", (_, phone) => expect(isValidPhone(phone)).toBe(false));

  it("measures the length once trimmed", () => {
    expect(isValidPhone(`  ${"1".repeat(20)}  `)).toBe(true);
    expect(isValidPhone(` ${"1".repeat(21)} `)).toBe(false);
  });

  it("has a Spanish message with an example", () => {
    expect(PHONE_MESSAGE).toContain("teléfono");
  });
});
