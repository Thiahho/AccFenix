"use client";

import { useState } from "react";
import * as m from "motion/react-m";
import { ChevronDownIcon } from "lucide-react";

/**
 * One FAQ entry on a native <details>: keyboard, find-in-page and no-JS keep working. Motion turns the chevron
 * and slides the answer in; the height itself animates in CSS (`::details-content`, see globals.css).
 */
export function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <details className="faq-item py-1" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-4 font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        {question}
        <m.span
          aria-hidden
          className="inline-flex shrink-0 text-brand"
          initial={false}
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
        >
          <ChevronDownIcon className="size-5" />
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
