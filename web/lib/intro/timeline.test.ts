import { describe, expect, it } from "vitest";
import { crackHeight, eggRadius, INTRO, phase, spring } from "@/lib/intro/timeline";

describe("phase", () => {
  it("is 0 before, 1 after and linear inside the window", () => {
    expect(phase(0.1, [0.2, 0.4])).toBe(0);
    expect(phase(0.3, [0.2, 0.4])).toBeCloseTo(0.5);
    expect(phase(0.9, [0.2, 0.4])).toBe(1);
  });
});

describe("spring", () => {
  it("starts at rest, oscillates and settles", () => {
    expect(spring(0, 4, 6)).toBe(0);
    expect(Math.abs(spring(0.06, 4, 6))).toBeGreaterThan(0.5);
    expect(Math.abs(spring(1.5, 4, 6))).toBeLessThan(0.01);
  });
  it("is 0 before it is triggered", () => {
    expect(spring(-0.2, 4, 6)).toBe(0);
  });
});

describe("egg profile", () => {
  it("closes at both poles and is narrower at the top than at the bottom", () => {
    expect(eggRadius(-1)).toBe(0);
    expect(eggRadius(1)).toBe(0);
    expect(eggRadius(0.5)).toBeLessThan(eggRadius(-0.5));
  });
});

describe("crack line", () => {
  it("wraps around the egg without a seam and stays near the middle", () => {
    expect(crackHeight(0)).toBeCloseTo(crackHeight(1));
    for (let i = 0; i <= 100; i++) {
      const v = crackHeight(i / 100);
      expect(v).toBeGreaterThan(0.45);
      expect(v).toBeLessThan(0.65);
    }
  });
});

describe("timeline", () => {
  it("orders the beats: drop, wobble, crack, split, dive, fade", () => {
    expect(INTRO.drop[1]).toBeLessThanOrEqual(INTRO.wobble[0]);
    expect(INTRO.crack[1]).toBeLessThanOrEqual(INTRO.split);
    expect(INTRO.split).toBeLessThan(INTRO.dive[0]);
    expect(INTRO.fade[1]).toBe(INTRO.end);
  });
});
