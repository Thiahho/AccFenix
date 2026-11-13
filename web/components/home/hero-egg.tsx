"use client";

import * as m from "motion/react-m";
import { useScroll, useTransform } from "motion/react";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";

/**
 * Hero photo frame: soft scale-and-fade entrance, then a slow float; a short wobble on hover and a light
 * parallax while the page scrolls past the hero. The image itself is rendered by the server and passed as children.
 */
export function HeroEgg({ children }: { children: React.ReactNode }) {
  const reduce = usePrefersReducedMotion();
  const { scrollY } = useScroll();
  const parallax = useTransform(scrollY, [0, 700], [0, 70], { clamp: true });

  return (
    <m.div className="relative mx-auto w-full max-w-[19rem] sm:max-w-xs" style={reduce ? undefined : { y: parallax }}>
      <div aria-hidden className="absolute -inset-6 rounded-full bg-yolk-light/20 blur-3xl" />
      <m.div
        className="relative"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
        transition={{
          opacity: { duration: 0.5, delay: 0.1 },
          scale: { duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] },
          y: { duration: 6, delay: 0.7, repeat: Infinity, ease: "easeInOut" },
        }}
        whileHover={{ rotate: [0, -3, 2.5, -1.5, 0], transition: { duration: 0.7, ease: "easeInOut" } }}
      >
        {children}
      </m.div>
    </m.div>
  );
}
