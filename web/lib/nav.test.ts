import { describe, expect, it } from "vitest";
import { initialHeaderScroll, nextHeaderScroll, pickActiveSection } from "./nav";

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

describe("nextHeaderScroll", () => {
  it("starts expanded and visible at the top", () => {
    expect(initialHeaderScroll).toEqual({ compact: false, hidden: false, lastY: 0 });
  });

  it("compacts after a few pixels of scroll", () => {
    expect(nextHeaderScroll(initialHeaderScroll, 4).compact).toBe(false);
    expect(nextHeaderScroll(initialHeaderScroll, 20).compact).toBe(true);
  });

  it("hides when scrolling down past the header", () => {
    const next = nextHeaderScroll({ compact: true, hidden: false, lastY: 300 }, 340);
    expect(next).toEqual({ compact: true, hidden: true, lastY: 340 });
  });

  it("reveals when scrolling up", () => {
    const next = nextHeaderScroll({ compact: true, hidden: true, lastY: 600 }, 560);
    expect(next.hidden).toBe(false);
  });

  it("never hides near the top", () => {
    expect(nextHeaderScroll({ compact: true, hidden: false, lastY: 20 }, 80).hidden).toBe(false);
    expect(nextHeaderScroll({ compact: true, hidden: true, lastY: 300 }, 0)).toEqual({ compact: false, hidden: false, lastY: 0 });
  });

  it("ignores tiny jitters and keeps the reference position", () => {
    const prev = { compact: true, hidden: true, lastY: 500 };
    expect(nextHeaderScroll(prev, 497)).toBe(prev);
  });

  it("clamps overscroll bounce to the top", () => {
    expect(nextHeaderScroll({ compact: true, hidden: false, lastY: 10 }, -30)).toEqual({ compact: false, hidden: false, lastY: 0 });
  });
});
