import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "@/lib/seo/json-ld";

const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);

describe("serializeJsonLd", () => {
  it("cannot close the script tag it is embedded in", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    const backslash = String.fromCharCode(0x5c);
    expect(out).toContain(`${backslash}u003c/script${backslash}u003e`);
  });

  it("escapes ampersands and line/paragraph separators", () => {
    const out = serializeJsonLd({ a: "x & y", b: LS + PS });
    expect(out).not.toContain("&");
    expect(out).not.toContain(LS);
    expect(out).not.toContain(PS);
  });

  it("still parses back to the same data", () => {
    const data = { "@type": "Product", name: "Huevos <b>&</b> más", note: LS, offers: { price: 1200 } };
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });
});
