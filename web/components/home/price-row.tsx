"use client";

import { useState } from "react";
import * as m from "motion/react-m";
import type { TargetAndTransition, Transition, Variants } from "motion/react";
import { GrowX, Pop } from "@/components/motion/reveal";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";
import { playCrack } from "@/lib/crack-sound";

type Props = {
  productName: string;
  label: string;
  /** Formatted retail price, or "Consultar". */
  price: string;
  /** Formatted wholesale price, when known. */
  wholesale: string | null;
};

/*
 * One price row of the board. Entrance (Pop, GrowX) inherits the parent Stagger's hidden/visible variants, so the
 * hover layers below drive their own `rest`/`hover` state from React instead of whileHover (a variant-controlling
 * parent would cut the inherited entrance). Transforms and opacity only; MotionConfig reducedMotion="user" turns the
 * transforms into instant changes for people who ask for less motion.
 */

const soft: Transition = { type: "spring", stiffness: 380, damping: 26 };
const wobbly: Transition = { type: "spring", stiffness: 420, damping: 9 };

const rowContent: Variants = { rest: { x: 0, transition: soft }, hover: { x: 6, transition: soft } };
const glow: Variants = { rest: { opacity: 0, transition: { duration: 0.25 } }, hover: { opacity: 1, transition: { duration: 0.25 } } };
const dash: Variants = { rest: { scaleX: 1, transition: soft }, hover: { scaleX: 1.6, transition: soft } };
const tag: Variants = {
  rest: { scale: 1, rotate: 0, transition: soft },
  hover: { scale: 1.08, rotate: -4, transition: wobbly },
};

/** Click "crack": quick squash and shake of the tag (< 400 ms). */
const shake: TargetAndTransition = {
  x: [0, -4, 4, -3, 2, 0],
  rotate: [0, -4, 3, -2, 0],
  scale: [1, 0.94, 1.04, 1],
  transition: { duration: 0.36, ease: "easeOut" },
};

export function PriceRow({ productName, label, price, wholesale }: Props) {
  const [active, setActive] = useState(false);
  const [cracks, setCracks] = useState(0);
  const reduce = usePrefersReducedMotion();
  const state = active ? "hover" : "rest";

  const name = `${productName}, ${label}, ${price}${wholesale ? `, mayorista ${wholesale}` : ""}`;

  return (
    <button
      type="button"
      aria-label={name}
      onClick={() => {
        playCrack();
        setCracks((n) => n + 1);
      }}
      onPointerEnter={(e) => e.pointerType === "mouse" && setActive(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setActive(false)}
      onFocus={(e) => e.currentTarget.matches(":focus-visible") && setActive(true)}
      onBlur={() => setActive(false)}
      className="relative -mx-3 w-[calc(100%+1.5rem)] cursor-pointer touch-manipulation rounded-xl px-3 py-2 text-left select-none focus-visible:ring-3 focus-visible:ring-yolk-light focus-visible:outline-none"
    >
      <m.span
        aria-hidden
        variants={glow}
        initial={false}
        animate={state}
        className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(120%_140%_at_85%_50%,color-mix(in_oklch,var(--yolk-light)_22%,transparent),transparent_70%)]"
      />
      <m.span
        variants={rowContent}
        initial={false}
        animate={state}
        className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4"
      >
        <span className="flex items-center gap-4">
          <span className="title-display text-2xl sm:text-3xl">{label}</span>
          <GrowX delay={0.1} aria-hidden className="ml-auto hidden w-14 shrink-0 sm:block">
            <m.span
              variants={dash}
              initial={false}
              animate={state}
              style={{ originX: 1 }}
              className={`block h-0.5 w-full transition-colors duration-300 ${active ? "bg-yolk-light" : "bg-cream/70"}`}
            />
          </GrowX>
        </span>
        <span className="flex flex-col items-end gap-1">
          <Pop delay={0.12} className="inline-block">
            <m.span variants={tag} initial={false} animate={state} className="inline-block">
              <m.span
                key={cracks}
                animate={cracks > 0 && !reduce ? shake : undefined}
                className={`relative block bg-brand px-3 py-1.5 font-heading text-xl font-extrabold text-brand-foreground tabular-nums transition-shadow duration-300 sm:text-3xl ${
                  active
                    ? "shadow-[0_8px_22px_rgb(0_0_0/0.4),0_0_26px_color-mix(in_oklch,var(--yolk-light)_45%,transparent)]"
                    : "shadow-[0_6px_18px_rgb(0_0_0/0.35)]"
                }`}
              >
                {price}
                {cracks > 0 && <CrackLine mirrored={cracks % 2 === 0} reduce={reduce} />}
              </m.span>
            </m.span>
          </Pop>
          {wholesale && <span className="text-xs text-cream/75 tabular-nums sm:text-sm">Mayorista {wholesale}</span>}
        </span>
      </m.span>
    </button>
  );
}

/** Zig-zag shell crack drawn over the tag, then faded out. With reduced motion it only fades. */
function CrackLine({ mirrored, reduce }: { mirrored: boolean; reduce: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-0 size-full overflow-visible text-charcoal ${mirrored ? "-scale-x-100" : ""}`}
    >
      <m.path
        d="M54 -2 L47 8 L56 15 L45 23 L54 30 L48 42 M47 8 L38 11 M45 23 L36 26"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: reduce ? 1 : 0, opacity: 1 }}
        animate={{ pathLength: 1, opacity: [1, 1, 0] }}
        transition={{ pathLength: { duration: 0.12, ease: "easeOut" }, opacity: { duration: 0.48, times: [0, 0.55, 1] } }}
      />
    </svg>
  );
}
