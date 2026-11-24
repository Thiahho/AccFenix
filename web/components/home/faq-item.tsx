"use client";

import { useState } from "react";
import * as m from "motion/react-m";
import { PlusIcon } from "lucide-react";

/**
 * One FAQ entry on a native <details>: keyboard, find-in-page and no-JS keep working. Motion turns the plus into a close mark
 * and slides the answer in; the height itself animates in CSS (`::details-content`, see globals.css).
 */
export function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <details className="faq-item" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="poster-focus-inset flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-base font-semibold transition-colors hover:text-caramel-deep sm:text-lg [&::-webkit-details-marker]:hidden">
        {question}
        <m.span
          aria-hidden
          className="inline-flex shrink-0 text-caramel-deep"
          initial={false}
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          <PlusIcon className="size-5" strokeWidth={2} />
        </m.span>
      </summary>
      {/* Remounts on each opening so it slides in; closed it renders fully visible, so no-JS readers lose nothing. */}
      <m.p
        key={open ? "open" : "closed"}
        className="max-w-[65ch] pb-4 text-muted-foreground text-pretty"
        initial={open ? { opacity: 0, y: -6 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        {answer}
      </m.p>
    </details>
  );
}
