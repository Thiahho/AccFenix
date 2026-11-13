import { describe, expect, it } from "vitest";
import { isHeaderCompact, pickActiveSection, showsWhatsappFab } from "./nav";

describe("pickActiveSection", () => {
  const line = 400;

  it("keeps the fallback while no section reached the line", () => {
    expect(pickActiveSection([{ id: "precios", top: 900 }, { id: "catalogo", top: 1800 }], line)).toBe("inicio");
  });

  it("returns the last section whose top passed the line", () => {
    const tops = [
      { id: "precios", top: -600 },
      { id: "catalogo", top: 120 },
      { id: "mayoristas", top: 700 },
    ];
    expect(pickActiveSection(tops, line)).toBe("catalogo");
  });

  it("treats a top exactly on the line as reached", () => {
    expect(pickActiveSection([{ id: "precios", top: 400 }], line)).toBe("precios");
  });

  it("skips sections missing from the page", () => {
    expect(pickActiveSection([{ id: "precios", top: -10 }, { id: "catalogo", top: null }], line)).toBe("precios");
  });
});

describe("isHeaderCompact", () => {
  it("stays roomy at the top and on overscroll bounce", () => {
    expect(isHeaderCompact(0)).toBe(false);
    expect(isHeaderCompact(-30)).toBe(false);
  });

  it("ignores the first few pixels of scroll", () => {
    expect(isHeaderCompact(4)).toBe(false);
  });

  it("compacts once the page has moved", () => {
    expect(isHeaderCompact(20)).toBe(true);
    expect(isHeaderCompact(4000)).toBe(true);
  });
});

describe("showsWhatsappFab", () => {
  it("shows the floating button on home, catalog and product pages", () => {
    expect(showsWhatsappFab("/")).toBe(true);
    expect(showsWhatsappFab("/catalogo")).toBe(true);
    expect(showsWhatsappFab("/producto/huevos-n1")).toBe(true);
  });

  it("hides it on the checkout, which has its own WhatsApp send button", () => {
    expect(showsWhatsappFab("/pedido")).toBe(false);
    expect(showsWhatsappFab("/pedido/")).toBe(false);
  });

  it("keeps it on pages that only share the prefix", () => {
    expect(showsWhatsappFab("/pedidos-mayoristas")).toBe(true);
  });
});
