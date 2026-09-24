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
          <span className="absolute -top-2 -right-2 grid min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-semibold text-brand-foreground tabular-nums">
            {lines}
          </span>
        )}
      </Link>
    </Button>
  );
}
