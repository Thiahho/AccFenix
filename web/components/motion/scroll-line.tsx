"use client";

import { useRef } from "react";
import * as m from "motion/react-m";
import { useScroll, useSpring } from "motion/react";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * Line that draws itself while its own box scrolls through the viewport (scaleX for horizontal, scaleY for
 * vertical). Reduced-motion visitors get the full line, static.
 */
export function ScrollLine({ className, vertical = false }: { className?: string; vertical?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 90%", "end 55%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  const style = reduce
    ? undefined
    : vertical
      ? { scaleY: progress, originY: 0 }
      : { scaleX: progress, originX: 0 };

  return <m.span ref={ref} aria-hidden className={cn("block", className)} style={style} />;
}
