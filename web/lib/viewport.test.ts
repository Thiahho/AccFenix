import { describe, expect, it } from "vitest";
import { keyboardInset } from "./viewport";

describe("keyboardInset", () => {
  it("is zero when the visual viewport covers the whole layout viewport", () => {
    expect(keyboardInset(800, 800, 0)).toBe(0);
  });

  it("measures the strip the on-screen keyboard covers at the bottom", () => {
    expect(keyboardInset(800, 480, 0)).toBe(320);
  });

  it("accounts for the visual viewport being panned down", () => {
    expect(keyboardInset(800, 480, 120)).toBe(200);
  });

  it("never goes negative and rounds fractional pixels", () => {
    expect(keyboardInset(800, 790.4, 20)).toBe(0);
    expect(keyboardInset(800, 479.6, 0)).toBe(320);
  });
});
