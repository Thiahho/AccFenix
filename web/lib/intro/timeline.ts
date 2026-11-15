/*
 * Pure pieces of the egg intro: beat timing, easing, the egg's profile and the zigzag crack. Kept free of three.js so
 * they are unit-testable and shared by the scene.
 */

/** Beat windows in seconds from the start of the scene. */
export const INTRO = {
  /** Egg falls into frame and lands with a squash. */
  drop: [0, 0.34],
  /** Egg rocks on its base, as if something inside pushes. */
  wobble: [0.42, 0.98],
  /** Crack runs around the shell from the front. */
  crack: [0.86, 1.1],
  /** Shell halves separate, shards fly, the yolk is revealed. */
  split: 1.12,
  /** Camera dives into the yolk. */
  dive: [1.4, 2.0],
  /** Page starts settling (zoom-out) under the overlay. */
  reveal: 1.62,
  /** Overlay fades away. */
  fade: [1.72, 2.08],
  end: 2.08,
} as const;

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** 0 before the window, 1 after it, linear inside. */
export function phase(t: number, [from, to]: readonly [number, number]) {
  return clamp01((t - from) / (to - from));
}

export const easeInQuad = (x: number) => x * x;
export const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;
export const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
export const easeInCubic = (x: number) => x ** 3;

/** Damped oscillation triggered at t = 0: 0 at rest, amplitude ~1 on the first swing, decaying with `decay`. */
export function spring(t: number, frequency: number, decay: number) {
  if (t <= 0) return 0;
  return Math.exp(-decay * t) * Math.sin(2 * Math.PI * frequency * t);
}

/**
 * Egg silhouette radius for a normalised height y in [-1, 1] (bottom → top): an ellipse whose top is 12 % narrower,
 * which reads as an egg instead of a capsule.
 */
export function eggRadius(y: number) {
  const inside = 1 - y * y;
  if (inside <= 0) return 0;
  return 0.72 * Math.sqrt(inside) * (1 - 0.12 * y);
}

// Zigzag crack: alternating teeth around the egg with a fixed, hand-tuned irregularity (deterministic on purpose so
// the animation is identical on every visit and in tests).
const TEETH = [-0.04, 0.05, -0.03, 0.042, -0.046, 0.034, -0.028, 0.052, -0.038, 0.03, -0.05, 0.044, -0.032, 0.038];
const CRACK_BASE = 0.555;

/** Height (v in [0, 1], bottom → top) of the crack at angle u in [0, 1]; periodic, so u = 0 and u = 1 meet. */
export function crackHeight(u: number) {
  const n = TEETH.length;
  const x = (((u % 1) + 1) % 1) * n;
  const i = Math.floor(x);
  const f = x - i;
  return CRACK_BASE + TEETH[i % n] * (1 - f) + TEETH[(i + 1) % n] * f;
}

/** Small deterministic PRNG (mulberry32) for shard sizes and velocities. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
