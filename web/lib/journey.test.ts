import { describe, expect, it } from "vitest";
import { buildTrail, reachedStops } from "./journey";

describe("buildTrail", () => {
  it("returns an empty trail without points", () => {
    expect(buildTrail([], "x", { amplitude: 30, lead: 40 })).toEqual({ d: "", stops: [] });
  });

  it("starts `lead` pixels before the first point along the main axis", () => {
    expect(buildTrail([{ x: 100, y: 50 }], "x", { amplitude: 0, lead: 40 }).d.startsWith("M60 50")).toBe(true);
    expect(buildTrail([{ x: 30, y: 100 }], "y", { amplitude: 0, lead: 40 }).d.startsWith("M30 60")).toBe(true);
  });

  it("places each point at its share of the total length", () => {
    const points = [
      { x: 100, y: 50 },
      { x: 300, y: 50 },
      { x: 500, y: 50 },
    ];
    const { stops } = buildTrail(points, "x", { amplitude: 0, lead: 100 });
    expect(stops).toHaveLength(3);
    expect(stops[0]).toBeCloseTo(0.2, 3);
    expect(stops[1]).toBeCloseTo(0.6, 3);
    expect(stops[2]).toBe(1);
  });

  it("winds between points and keeps the stops increasing", () => {
    const points = [
      { x: 40, y: 30 },
      { x: 40, y: 230 },
      { x: 40, y: 430 },
      { x: 40, y: 700 },
    ];
    const { d, stops } = buildTrail(points, "y", { amplitude: 18, lead: 40 });
    expect(d.match(/C/g)).toHaveLength(4);
    expect(d).toContain("58");
    expect(d).toContain("22");
    for (let i = 1; i < stops.length; i++) expect(stops[i]).toBeGreaterThan(stops[i - 1]);
    expect(stops[0]).toBeGreaterThan(0);
    expect(stops.at(-1)).toBe(1);
  });
});

describe("reachedStops", () => {
  const stops = [0.1, 0.4, 0.7, 1];

  it("reaches nothing before the trail starts", () => {
    expect(reachedStops(0, stops)).toBe(0);
  });

  it("counts every stop the drawn trail already passed, including one exactly on it", () => {
    expect(reachedStops(0.4, stops)).toBe(2);
    expect(reachedStops(0.55, stops)).toBe(2);
  });

  it("reaches the goal a hair before the spring settles on 1", () => {
    expect(reachedStops(0.997, stops)).toBe(4);
  });

  it("handles a trail that was not measured yet", () => {
    expect(reachedStops(0.5, [])).toBe(0);
  });
});
