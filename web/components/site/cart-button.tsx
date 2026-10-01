"use client";

import Link from "next/link";
import { ShoppingBagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/lib/use-hydrated";
import { totalUnits, useCart } from "@/stores/cart";

export function CartButton() {
  const hydrated = useHydrated();
  const items = useCart((s) => s.items);
  const lines = hydrated ? items.length : 0;

  return (
    <Button asChild variant="outline" className="relative gap-2">
      <Link href="/pedido" aria-label={lines ? `Mi pedido, ${totalUnits(items)} unidades` : "Mi pedido"}>
        <ShoppingBagIcon aria-hidden />
        <span className="hidden sm:inline">Mi pedido</span>
        {lines > 0 && (
          // La key reinicia el pulso cada vez que cambia el pedido.
          <span key={totalUnits(items)} className="cart-bump absolute -top-2.5 -right-2.5 grid h-6 min-w-6 place-items-center rounded-full bg-brand px-1.5 text-[13px] font-semibold text-brand-foreground tabular-nums">
            {lines}
          </span>
        )}
      </Link>
    </Button>
  );
}
