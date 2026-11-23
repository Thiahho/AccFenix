"use client";

import { useState } from "react";
import * as m from "motion/react-m";
import type { TargetAndTransition, Transition, Variants } from "motion/react";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";
import { notifyAdded } from "@/components/site/order-toast";
import { useCart, type CartItem } from "@/stores/cart";

type Props = {
  /** Cart line this price adds; null disables it (variant missing from the product data). */
  item: Omit<CartItem, "qty"> | null;
  /** Product cover for the "added" toast. */
  imageUrl: string | null;
  productName: string;
  label: string;
  /** Formatted retail price, or "Consultar". */
  price: string;
  /** Size shown next to the price when the card has no size columns. */
  caption?: string;
};

/*
 * One price of the menu board. The hover layer drives its own `rest`/`hover` state from React instead of whileHover (a
 * variant-controlling parent would cut the inherited entrance). Transforms only; MotionConfig reducedMotion="user" turns
 * them into instant changes for people who ask for less motion. A click adds one unit to the cart and shows the same
 * "added" toast the product card shows.
 */

const wobbly: Transition = { type: "spring", stiffness: 420, damping: 12 };
const soft: Transition = { type: "spring", stiffness: 380, damping: 26 };

const tag: Variants = {
  rest: { scale: 1, transition: soft },
  hover: { scale: 1.06, transition: wobbly },
};

/** Click feedback: quick squash and shake of the price (< 400 ms). */
const shake: TargetAndTransition = {
  x: [0, -3, 3, -2, 1, 0],
  scale: [1, 0.94, 1.04, 1],
  transition: { duration: 0.36, ease: "easeOut" },
};

export function PriceCell({ item, imageUrl, productName, label, price, caption }: Props) {
  const add = useCart((s) => s.add);
  const [active, setActive] = useState(false);
  const [clicks, setClicks] = useState(0);
  const reduce = usePrefersReducedMotion();
  const state = active && item ? "hover" : "rest";
  const quoted = price === "Consultar";

  const name = `${item ? "Agregar al pedido: " : ""}${productName}, ${label}, ${price}`;

  return (
    <button
      type="button"
      aria-label={name}
      disabled={!item}
      onClick={() => {
        if (!item) return;
        setClicks((n) => n + 1);
        add(item, 1);
        notifyAdded({ title: item.productName, detail: item.valuesLabel, availability: item.availability, imageUrl });
      }}
      onPointerEnter={(e) => e.pointerType === "mouse" && setActive(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setActive(false)}
      onFocus={(e) => e.currentTarget.matches(":focus-visible") && setActive(true)}
      onBlur={() => setActive(false)}
      className={`flex min-h-11 cursor-pointer touch-manipulation items-center justify-center gap-1 rounded-lg px-1 text-center transition-colors select-none enabled:hover:bg-espresso enabled:hover:text-ivory focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${caption ? "border border-latte px-3" : "w-full"}`}
    >
      {caption && <span className="text-xs font-medium">{caption}</span>}
      <m.span variants={tag} initial={false} animate={state} className="inline-block">
        <m.span
          key={clicks}
          animate={clicks > 0 && !reduce ? shake : undefined}
          className={`block font-heading font-extrabold whitespace-nowrap tabular-nums ${quoted ? "text-[11px]" : "text-sm sm:text-[15px]"}`}
        >
          {price}
        </m.span>
      </m.span>
    </button>
  );
}
