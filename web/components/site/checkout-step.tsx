"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { CheckIcon, LockIcon, PencilIcon } from "lucide-react";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";
import type { StepStatus } from "@/lib/orders/steps";
import { cn } from "@/lib/utils";

type Props = {
  index: number;
  title: string;
  status: StepStatus;
  /** Compact recap of what the step holds, shown once it is done. */
  summary?: string;
  /** Focus the first control and scroll the step into view when it opens (not on the first render). */
  focusOnOpen: boolean;
  onOpen: () => void;
  children: React.ReactNode;
};

const FOCUSABLE = "input:not([type=hidden]), textarea, select, [role=radio], button:not([disabled])";

/**
 * One step of the checkout. Only the active step shows its fields; a done step collapses to an editable summary and a
 * locked one stays dimmed until the steps before it are complete.
 */
export function CheckoutStep({ index, title, status, summary, focusOnOpen, onOpen, children }: Props) {
  const ref = useRef<HTMLLIElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const reduce = usePrefersReducedMotion();
  const active = status === "active";
  const locked = status === "locked";
  const headingId = `paso-${index + 1}`;

  useEffect(() => {
    if (!active || !focusOnOpen) return;
    const frame = requestAnimationFrame(() => {
      const target = bodyRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus({ preventScroll: true });
      ref.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [active, focusOnOpen, reduce]);

  return (
    <li ref={ref} aria-current={active ? "step" : undefined} className="scroll-mt-24">
      {/* A group (not the list item) carries aria-disabled, which listitem does not support. */}
      <div
        role="group"
        aria-disabled={locked || undefined}
        aria-labelledby={headingId}
        className={cn(
          "rounded-xl border transition-[background-color,border-color,opacity] duration-300",
          active ? "border-espresso bg-background" : "border-dashed border-caramel/60 bg-muted/30",
          locked && "opacity-55",
        )}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <span
            aria-hidden
            className={cn(
              "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums transition-colors duration-300",
              status === "done" ? "bg-brand text-brand-foreground" : active ? "bg-espresso text-cream" : "border bg-background text-muted-foreground",
            )}
          >
            {status === "done" ? <CheckIcon className="size-4" /> : index + 1}
          </span>
          <h3 id={headingId} className={cn("font-semibold", !active && "text-sm")}>
            {title}
          </h3>
          {locked && <LockIcon aria-hidden className="ml-auto size-3.5 text-muted-foreground" />}
          {(status === "done" || status === "open") && (
            <button
              type="button"
              onClick={onOpen}
              aria-label={`Editar: ${title}${summary ? ` (${summary})` : ""}`}
              className="ml-auto inline-flex min-h-9 max-w-[60%] items-center gap-1.5 rounded-full bg-background px-3 text-sm text-foreground ring-1 ring-border transition-colors hover:ring-brand focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="truncate">{summary || "Completar"}</span>
              <PencilIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {active && (
            <m.div
              key="body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <m.div
                ref={bodyRef}
                initial={{ x: 16 }}
                animate={{ x: 0 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="space-y-4 px-4 pt-1 pb-4"
              >
                {children}
              </m.div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </li>
  );
}

/** Slim progress bar over the steps. */
export function CheckoutProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground tabular-nums">
        Paso {current + 1} de {total}
      </p>
      <div aria-hidden className="grid gap-1" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className="h-1 overflow-hidden rounded-full bg-muted">
            <m.span
              className="block h-full origin-left rounded-full bg-brand"
              initial={false}
              animate={{ scaleX: i <= current ? 1 : 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
