"use client";

import * as m from "motion/react-m";
import type { Transition, Variants } from "motion/react";

/*
 * Small client wrappers so server sections can animate without becoming client components.
 * Every wrapper uses the shared "hidden" / "visible" variant names, so nested items (StaggerItem, Pop, GrowX)
 * inherit the state from the nearest Stagger or Reveal and play in sequence. Transforms and opacity only.
 * Every element carries `data-reveal`: the server HTML renders the hidden state inline, so pages using these wrappers
 * render <NoScriptReveal /> to force them visible when JS never runs.
 */

const tags = {
  div: m.div,
  span: m.span,
  p: m.p,
  ul: m.ul,
  ol: m.ol,
  li: m.li,
  dl: m.dl,
  article: m.article,
} as const;

type Tag = keyof typeof tags;

type BaseProps = {
  as?: Tag;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-hidden"?: boolean;
  children?: React.ReactNode;
};

const ease = [0.22, 1, 0.36, 1] as const;

/** Shared viewport rule for reveals: play once, a little before the element is fully in view. */
export const revealViewport = { once: true, margin: "-80px" } as const;

function itemVariants(y: number, duration: number): Variants {
  return {
    hidden: { opacity: 0, y },
    visible: { opacity: 1, y: 0, transition: { duration, ease } },
  };
}

/**
 * Without JS the motion wrappers never leave their inline hidden state; this <noscript> style overrides it. Server
 * markup only, so it needs no client code.
 */
export function NoScriptReveal() {
  return (
    <noscript
      dangerouslySetInnerHTML={{
        __html: "<style>[data-reveal]{opacity:1!important;transform:none!important}</style>",
      }}
    />
  );
}

/** Container that reveals its StaggerItem children one after the other when it enters the viewport. */
export function Stagger({ as = "div", stagger = 0.08, delay = 0, ...rest }: BaseProps & { stagger?: number; delay?: number }) {
  const Comp = tags[as] as typeof m.div;
  const variants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };
  return <Comp data-reveal variants={variants} initial="hidden" whileInView="visible" viewport={revealViewport} {...rest} />;
}

/** Child of a Stagger: fades in while rising `y` px. */
export function StaggerItem({ as = "div", y = 16, duration = 0.45, ...rest }: BaseProps & { y?: number; duration?: number }) {
  const Comp = tags[as] as typeof m.div;
  return <Comp data-reveal variants={itemVariants(y, duration)} {...rest} />;
}

/** Standalone fade-and-rise when the element enters the viewport. */
export function Reveal({ as = "div", y = 20, duration = 0.5, delay = 0, ...rest }: BaseProps & { y?: number; duration?: number; delay?: number }) {
  const Comp = tags[as] as typeof m.div;
  const base = itemVariants(y, duration);
  const variants: Variants = {
    hidden: base.hidden,
    visible: { opacity: 1, y: 0, transition: { duration, ease, delay } },
  };
  return <Comp data-reveal variants={variants} initial="hidden" whileInView="visible" viewport={revealViewport} {...rest} />;
}

const popSpring: Transition = { type: "spring", stiffness: 420, damping: 18 };

/** Springs from a slightly smaller scale; plays with the parent Stagger/Reveal. */
export function Pop({ as = "span", from = 0.9, delay = 0, ...rest }: BaseProps & { from?: number; delay?: number }) {
  const Comp = tags[as] as typeof m.div;
  const variants: Variants = {
    hidden: { opacity: 0, scale: from },
    visible: { opacity: 1, scale: 1, transition: { ...popSpring, delay } },
  };
  return <Comp data-reveal variants={variants} {...rest} />;
}

/** Line that grows from its left edge; plays with the parent Stagger/Reveal. */
export function GrowX({ as = "span", duration = 0.5, delay = 0, ...rest }: BaseProps & { duration?: number; delay?: number }) {
  const Comp = tags[as] as typeof m.div;
  const variants: Variants = {
    hidden: { scaleX: 0 },
    visible: { scaleX: 1, transition: { duration, ease, delay } },
  };
  return <Comp data-reveal variants={variants} style={{ originX: 0 }} {...rest} />;
}
