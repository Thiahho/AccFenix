"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import * as m from "motion/react-m";
import { useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { ClipboardListIcon, MessageCircleIcon, TruckIcon } from "lucide-react";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";
import { buildTrail, reachedStops, type Point, type Trail } from "@/lib/journey";
import type { Step } from "@/lib/home-content";
import { cn } from "@/lib/utils";

const icons = [MessageCircleIcon, ClipboardListIcon, TruckIcon];

/** Trail shape per layout: a gentle vertical wind on mobile, wider bends across the row on desktop. */
const shapes = {
  x: { amplitude: 40, lead: 56 },
  y: { amplitude: 18, lead: 44 },
} as const;

const pop = { duration: 0.45, ease: [0.22, 1, 0.36, 1] } as const;

/**
 * "Cómo trabajamos" as a route: a trail draws itself while the section scrolls, lighting each checkpoint (Pedís,
 * Confirmamos, Entregamos) as it passes, with a small truck riding the tip, and ends at the egg. The steps stay a
 * plain ordered list in the DOM; the trail, truck and egg art are decorative. Reduced motion: everything drawn and lit.
 */
export function Journey({ steps, goal }: { steps: Step[]; goal: Step }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const truckRef = useRef<HTMLSpanElement>(null);
  const [trail, setTrail] = useState<(Trail & { w: number; h: number }) | null>(null);
  const [reached, setReached] = useState(0);
  const reduce = usePrefersReducedMotion();

  const { scrollYProgress } = useScroll({ target: wrapRef, offset: ["start 80%", "end 60%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 32, restDelta: 0.0005 });

  const total = steps.length + 1;
  const lit = reduce ? total : reached;

  const follow = useCallback((value: number, stops: number[]) => {
    setReached(reachedStops(value, stops));
    const path = pathRef.current;
    const truck = truckRef.current;
    if (!path || !truck) return;
    const riding = value > 0.01 && value < (stops.at(-2) ?? 1) + 0.04;
    truck.dataset.visible = riding ? "true" : "false";
    if (!riding) return;
    const { x, y } = path.getPointAtLength(value * path.getTotalLength());
    truck.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  }, []);

  // Measures the checkpoint centres and rebuilds the trail whenever the layout changes (breakpoints, fonts).
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => {
      const box = wrap.getBoundingClientRect();
      const points: Point[] = [...wrap.querySelectorAll<HTMLElement>("[data-checkpoint]")].map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
      });
      if (points.length < 2) return;
      const first = points[0];
      const last = points[points.length - 1];
      const axis = Math.abs(last.x - first.x) > Math.abs(last.y - first.y) ? "x" : "y";
      setTrail({ ...buildTrail(points, axis, shapes[axis]), w: box.width, h: box.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  useMotionValueEvent(progress, "change", (value) => {
    if (trail) follow(value, trail.stops);
  });

  // Sync once the trail exists (or changes), even if the page was already scrolled past the section.
  useLayoutEffect(() => {
    if (trail) follow(progress.get(), trail.stops);
  }, [trail, progress, follow]);

  const done = lit >= total;

  return (
    <div ref={wrapRef} className="relative">
      {trail && (
        <svg
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 overflow-visible"
          width={trail.w}
          height={trail.h}
          viewBox={`0 0 ${trail.w} ${trail.h}`}
          fill="none"
        >
          {/* The whole route, faint and dotted; the solid stroke on top is the part already travelled. */}
          <path d={trail.d} stroke="var(--cream)" strokeOpacity={0.35} strokeWidth={4} strokeLinecap="round" strokeDasharray="0.1 12" />
          <m.path
            ref={pathRef}
            d={trail.d}
            stroke="var(--cream)"
            strokeWidth={4}
            strokeLinecap="round"
            style={reduce ? undefined : { pathLength: progress }}
          />
        </svg>
      )}
      {!reduce && (
        <span
          ref={truckRef}
          aria-hidden
          data-visible="false"
          className="journey-truck pointer-events-none absolute top-0 left-0 z-20 grid size-9 place-items-center rounded-full bg-yolk-light text-charcoal shadow-md"
        >
          <TruckIcon className="size-5" />
        </span>
      )}

      <ol className="relative grid gap-10 md:grid-cols-4 md:gap-6">
        {steps.map((step, i) => {
          const Icon = icons[i] ?? TruckIcon;
          const on = lit > i;
          return (
            <li key={step.title} className="grid grid-cols-[5rem_1fr] items-start gap-4 md:flex md:flex-col md:items-center md:text-center">
              <div className="flex h-20 items-center justify-center md:h-24 md:w-full">
                <m.span
                  data-checkpoint
                  aria-hidden
                  initial={false}
                  animate={on ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                  transition={pop}
                  className={cn(
                    "relative z-10 grid size-14 place-items-center rounded-full transition-colors duration-300",
                    on ? "bg-cream text-brand ring-4 ring-cream/25" : "bg-brand text-cream/75 ring-2 ring-cream/45",
                  )}
                >
                  <Icon className="size-6" />
                  <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-yolk-light text-[11px] font-bold text-charcoal tabular-nums">
                    {i + 1}
                  </span>
                </m.span>
              </div>
              <m.div
                initial={false}
                animate={{ opacity: on ? 1 : 0.75, y: on ? 0 : 6 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex flex-col gap-2 pt-3 md:pt-2"
              >
                <strong className="title-display text-2xl">{step.title}</strong>
                <span className="leading-relaxed text-pretty text-brand-foreground/90">{step.text}</span>
              </m.div>
            </li>
          );
        })}

        <li className="grid grid-cols-[5rem_1fr] items-start gap-4 md:flex md:flex-col md:items-center md:text-center">
          <div className="flex h-24 items-center justify-center md:h-24 md:w-full">
            <span data-checkpoint aria-hidden className="relative z-10 block">
              <m.span
                className="absolute -inset-5 rounded-full bg-yolk-light blur-xl"
                initial={false}
                animate={done ? { opacity: [0, 0.85, 0.4], scale: [0.6, 1.25, 1.05] } : { opacity: 0, scale: 0.6 }}
                transition={{ duration: 1.1, ease: "easeOut" }}
              />
              <m.svg
                viewBox="0 0 80 100"
                className="relative block h-24 w-auto drop-shadow-[0_6px_10px_oklch(0.25_0.012_50/0.35)] md:h-28"
                style={{ originY: 0.9 }}
                initial={false}
                animate={done ? { rotate: [0, -9, 7, -4, 2, 0] } : { rotate: 0 }}
                transition={{ duration: 0.9, ease: "easeInOut" }}
              >
                <path d="M40 3C61 3 77 38 77 62C77 84 61 97 40 97C19 97 3 84 3 62C3 38 19 3 40 3Z" fill="var(--cream)" />
                <path d="M62 70C60 84 50 90 40 90" stroke="var(--cream-deep)" strokeWidth={6} strokeLinecap="round" />
                <ellipse cx="28" cy="34" rx="7" ry="11" transform="rotate(-20 28 34)" fill="white" fillOpacity={0.7} />
                <text x="40" y="70" textAnchor="middle" className="wordmark" fontSize="22" fill="var(--egg-red)">
                  Eggy
                </text>
              </m.svg>
            </span>
          </div>
          <m.div
            initial={false}
            animate={{ opacity: done ? 1 : 0.75, y: done ? 0 : 6 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex flex-col gap-2 pt-3 md:pt-2"
          >
            <span className="eyebrow text-brand-foreground/85">La meta</span>
            <strong className="title-display text-2xl">{goal.title}</strong>
            <span className="leading-relaxed text-pretty text-brand-foreground/90">{goal.text}</span>
          </m.div>
        </li>
      </ol>
    </div>
  );
}
