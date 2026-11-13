/** Geometry for the "Cómo trabajamos" journey: a winding trail through the checkpoints, drawn by scroll. */

export type Point = { x: number; y: number };

/** SVG path data plus, for every point, the fraction of the trail length where it sits (last one is 1). */
export type Trail = { d: string; stops: number[] };

type Cubic = [Point, Point, Point, Point];

/** Samples per curve when measuring length; plenty for gentle bends a few hundred pixels long. */
const SAMPLES = 32;

/** Spring-driven progress settles just under 1, so the goal counts as reached within this margin. */
const REACH_TOLERANCE = 0.005;

const round = (n: number) => Math.round(n * 10) / 10;

function pointOnCubic([p0, p1, p2, p3]: Cubic, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const e = t * t * t;
  return { x: a * p0.x + b * p1.x + c * p2.x + e * p3.x, y: a * p0.y + b * p1.y + c * p2.y + e * p3.y };
}

function cubicLength(curve: Cubic): number {
  let length = 0;
  let prev = curve[0];
  for (let i = 1; i <= SAMPLES; i++) {
    const next = pointOnCubic(curve, i / SAMPLES);
    length += Math.hypot(next.x - prev.x, next.y - prev.y);
    prev = next;
  }
  return length;
}

/**
 * Trail that starts `lead` px before the first point along `axis` and bends through every point in order. Each
 * stretch bows sideways by up to `amplitude` (alternating sides), so the route winds without missing a checkpoint.
 */
export function buildTrail(points: Point[], axis: "x" | "y", { amplitude, lead }: { amplitude: number; lead: number }): Trail {
  if (points.length === 0) return { d: "", stops: [] };
  const cross = axis === "x" ? "y" : "x";
  const first = points[0];
  const start: Point = axis === "x" ? { x: first.x - lead, y: first.y } : { x: first.x, y: first.y - lead };

  const curves: Cubic[] = [];
  let from = start;
  points.forEach((to, i) => {
    const side = i % 2 === 0 ? 1 : -1;
    const control = (t: number): Point => {
      const p = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
      p[cross] += side * amplitude;
      return p;
    };
    curves.push([from, control(1 / 3), control(2 / 3), to]);
    from = to;
  });

  const lengths = curves.map(cubicLength);
  const total = lengths.reduce((sum, l) => sum + l, 0);
  let run = 0;
  const stops = lengths.map((l, i) => {
    run += l;
    return i === lengths.length - 1 || total === 0 ? 1 : run / total;
  });

  const fmt = (p: Point) => `${round(p.x)} ${round(p.y)}`;
  const d = `M${fmt(start)}` + curves.map(([, c1, c2, end]) => ` C${fmt(c1)} ${fmt(c2)} ${fmt(end)}`).join("");
  return { d, stops };
}

/** How many checkpoints the drawn part of the trail (0..1) has already reached. */
export function reachedStops(progress: number, stops: number[]): number {
  return stops.filter((stop) => stop <= progress + REACH_TOLERANCE).length;
}
