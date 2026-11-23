import { describe, expect, it } from "vitest";
import { buildComprobanteMessage, buildVariantMessage, whatsappUrl } from "@/lib/whatsapp";

describe("buildVariantMessage", () => {
  it("names the product and its size without prices", () => {
    const text = buildVariantMessage("Latte frío", "Chico (500 cc)");
    expect(text).toContain("• Latte frío — Chico (500 cc)");
    expect(text).not.toContain("$");
  });
});

describe("buildComprobanteMessage", () => {
  it("names the order number so the receipt is matched to it", () => {
    expect(buildComprobanteMessage(42)).toContain("pedido #42");
  });
});

describe("whatsappUrl", () => {
  it("keeps only the digits of the number and encodes the text", () => {
    expect(whatsappUrl("+54 9 11 2233-4455", "Hola ¡ok!")).toBe("https://wa.me/5491122334455?text=Hola%20%C2%A1ok!");
  });
});
