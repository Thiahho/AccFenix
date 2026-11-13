"use client";

import { useEffect, useRef } from "react";
import { useInView } from "motion/react";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * Number that counts up from zero the first time it scrolls into view. The server renders the final value,
 * so the text is right without JavaScript and for reduced-motion visitors.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!inView || reduce || !node || value <= 0) return;
    // A plain rAF tween: Motion's standalone animate() would add its whole sequencing engine to the bundle.
    const duration = 900;
    let start: number | null = null;
    let frame = requestAnimationFrame(function tick(now) {
      start ??= now;
      const t = Math.min((now - start) / duration, 1);
      node.textContent = String(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(frame);
      node.textContent = String(value);
    };
  }, [inView, reduce, value]);

  return (
    // Fixed width in digits (with tabular-nums) so counting never reflows the surrounding text.
    <span ref={ref} className={cn("inline-block text-right", className)} style={{ minWidth: `${String(value).length}ch` }}>
      {value}
    </span>
  );
}
