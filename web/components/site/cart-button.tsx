"use client";

import Link from "next/link";
import { ShoppingBagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { unitsLabel } from "@/lib/qty";
import { useHydrated } from "@/lib/use-hydrated";
import { totalUnits, useCart } from "@/stores/cart";

export function CartButton() {
  const hydrated = useHydrated();
  const items = useCart((s) => s.items);
  const lines = hydrated ? items.length : 0;

  return (
    <Button
      asChild
      variant="ghost"
      className="poster-focus-inset h-11 gap-2 rounded-full border-0 bg-primary px-4 text-[13px] font-bold text-primary-foreground hover:bg-[var(--poster-gold-hover)] hover:text-primary-foreground lg:px-5"
    >
      <Link href="/pedido" aria-label={lines ? `Mi pedido, ${unitsLabel(totalUnits(items))}` : "Mi pedido"}>
        <ShoppingBagIcon aria-hidden className="size-5" />
        <span className="hidden lg:inline">Mi pedido</span>
        {lines > 0 && (
          // La key reinicia el pulso cada vez que cambia el pedido.
          <span key={totalUnits(items)} className="cart-bump grid h-6 min-w-6 place-items-center rounded-full bg-primary-foreground px-1 text-[13px] font-extrabold text-primary tabular-nums">
            {lines}
          </span>
        )}
      </Link>
    </Button>
  );
}
