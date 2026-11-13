"use client";

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";

/**
 * Public-site Motion setup: `LazyMotion` + `domAnimation` keeps the bundle to the animation/gesture/in-view features
 * (`strict` forbids the heavier `motion.*` components, use `m.*`), and `reducedMotion="user"` drops transform
 * animations for visitors who ask for reduced motion.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
