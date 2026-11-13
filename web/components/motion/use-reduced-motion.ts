"use client";

import { useReducedMotion } from "motion/react";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * `useReducedMotion` that stays false until hydration, so the server HTML and the first client render match;
 * use it for effects MotionConfig does not cover (scroll-linked styles, loops, counters).
 */
export function usePrefersReducedMotion() {
  const reduce = useReducedMotion();
  const hydrated = useHydrated();
  return hydrated && reduce === true;
}
