"use client";

import * as m from "motion/react-m";
import { useScroll, useTransform } from "motion/react";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";

/**
 * Hero photo frame: a slow float, a short wobble on hover and a light parallax while the page scrolls past the hero.
 * The image itself is rendered by the server and passed as children; it has no hidden initial state, so the priority
 * photo (the LCP element on phones) is visible before motion hydrates.
 */
export function HeroEgg({ children }: { children: React.ReactNode }) {
  const reduce = usePrefersReducedMotion();
  const { scrollY } = useScroll();
  const parallax = useTransform(scrollY, [0, 700], [0, 70], { clamp: true });

  return (
    <m.div className="relative mx-auto w-full max-w-[19rem] sm:max-w-xs" style={reduce ? undefined : { y: parallax }}>
      <div aria-hidden className="absolute -inset-6 rounded-full bg-latte/20 blur-3xl" />
      <m.div
        className="relative"
        initial={{ y: 0 }}
        animate={{ y: [0, -10, 0] }}
        transition={{ y: { duration: 6, delay: 0.7, repeat: Infinity, ease: "easeInOut" } }}
        whileHover={{ rotate: [0, -3, 2.5, -1.5, 0], transition: { duration: 0.7, ease: "easeInOut" } }}
      >
        {children}
      </m.div>
    </m.div>
  );
}
