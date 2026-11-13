import { describe, expect, it } from "vitest";
import { CRACK_WINDOW, planCrack } from "./crack-sound";

/** Deterministic random source cycling through the given values. */
function sequence(...values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

const sources = {
  low: () => 0,
  high: () => 0.9999,
  mid: () => 0.5,
  mixed: sequence(0.13, 0.82, 0.47, 0.91, 0.05, 0.66, 0.29),
};

describe("planCrack", () => {
  it.each(Object.entries(sources))("schedules 3 to 5 bursts (%s)", (_, random) => {
    const { bursts } = planCrack(random);
    expect(bursts.length).toBeGreaterThanOrEqual(3);
    expect(bursts.length).toBeLessThanOrEqual(5);
  });

  it.each(Object.entries(sources))("starts at 0 and keeps bursts in order inside the crack window (%s)", (_, random) => {
    const { bursts } = planCrack(random);
    expect(bursts[0].at).toBe(0);
    for (let i = 1; i < bursts.length; i++) expect(bursts[i].at).toBeGreaterThan(bursts[i - 1].at);
    const last = bursts[bursts.length - 1];
    expect(last.at + last.duration).toBeLessThanOrEqual(CRACK_WINDOW + 1e-9);
    expect(CRACK_WINDOW).toBeLessThanOrEqual(0.08);
  });

  it.each(Object.entries(sources))("uses short, decaying, moderate bursts in a bright band (%s)", (_, random) => {
    const { bursts } = planCrack(random);
    for (const b of bursts) {
      expect(b.duration).toBeGreaterThanOrEqual(0.004);
      expect(b.duration).toBeLessThanOrEqual(0.016);
      expect(b.gain).toBeGreaterThan(0);
      expect(b.gain).toBeLessThanOrEqual(0.8);
      expect(b.frequency).toBeGreaterThanOrEqual(1800);
      expect(b.frequency).toBeLessThanOrEqual(5500);
      expect(b.q).toBeGreaterThan(0);
    }
    for (let i = 1; i < bursts.length; i++) expect(bursts[i].gain).toBeLessThan(bursts[i - 1].gain);
  });

  it.each(Object.entries(sources))("adds a quiet falling drip after the last burst (%s)", (_, random) => {
    const { bursts, drip } = planCrack(random);
    const last = bursts[bursts.length - 1];
    expect(drip.at).toBeGreaterThanOrEqual(last.at + last.duration);
    expect(drip.to).toBeLessThan(drip.from);
    expect(drip.gain).toBeLessThan(bursts[0].gain);
    expect(drip.duration).toBeGreaterThan(0);
    expect(drip.at + drip.duration).toBeLessThanOrEqual(0.25);
  });

  it("is deterministic for the same random source", () => {
    expect(planCrack(sequence(0.3, 0.7, 0.1))).toEqual(planCrack(sequence(0.3, 0.7, 0.1)));
  });

  it("varies between random sources so clicks do not sound identical", () => {
    expect(planCrack(sources.low)).not.toEqual(planCrack(sources.high));
    expect(planCrack(sequence(0.2, 0.4))).not.toEqual(planCrack(sequence(0.6, 0.9)));
  });
});
