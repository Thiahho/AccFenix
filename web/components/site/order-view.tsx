"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2Icon } from "lucide-react";
import { AvailabilityBadge } from "@/components/site/availability-badge";
import { OrderFormCard } from "@/components/site/order-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, type PublicSettings } from "@/lib/api";
import { useHydrated } from "@/lib/use-hydrated";
import { isWholesale } from "@/lib/whatsapp";
import { MAX_QTY, totalUnits, useCart } from "@/stores/cart";

export function OrderView({ settings }: { settings: PublicSettings }) {
  const hydrated = useHydrated();
  const { items, setQty, remove, sync } = useCart();
  const [removedCount, setRemovedCount] = useState(0);

  // Al entrar, refresca la disponibilidad y quita variantes que ya no existen.
  useEffect(() => {
    const current = useCart.getState().items;
    if (current.length === 0) return;
    api
      .variantStatus(current.map((i) => i.variantId))
      .then((statuses) => {
        sync(statuses);
        setRemovedCount(current.length - useCart.getState().items.length);
      })
      .catch(() => {});
  }, [sync]);

  if (!hydrated) return <div className="mt-8 h-40 animate-pulse rounded-xl bg-muted" />;

  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed p-10 text-center">
        <p className="font-medium">Tu pedido está vacío</p>
        <p className="mt-1 text-sm text-muted-foreground">Agregá barrales, accesorios o kits desde el catálogo.</p>
        <Button asChild className="mt-6">
          <Link href="/">Ir al catálogo</Link>
        </Button>
      </div>
    );
  }

  const units = totalUnits(items);
  const wholesale = isWholesale(items, settings.wholesaleThreshold);

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
      <section aria-labelledby="productos">
        <h2 id="productos" className="sr-only">Productos</h2>
        {removedCount > 0 && (
          <p role="status" className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            Quitamos {removedCount} {removedCount === 1 ? "producto que ya no está" : "productos que ya no están"} en el catálogo.
          </p>
        )}
        <ul className="divide-y rounded-xl border">
          {items.map((item) => (
            <li key={item.variantId} className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <Link href={`/producto/${item.productSlug}`} className="font-medium transition-colors hover:text-brass">
                  {item.productName}
                </Link>
                <p className="text-sm text-muted-foreground">{item.valuesLabel}</p>
                <AvailabilityBadge availability={item.availability} className="mt-2" />
              </div>
              <div className="flex items-center gap-2">
                <label className="sr-only" htmlFor={`qty-${item.variantId}`}>Cantidad de {item.productName}</label>
                <Input
                  id={`qty-${item.variantId}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_QTY}
                  value={item.qty}
                  onChange={(e) => setQty(item.variantId, Number(e.target.value))}
                  className="w-24 text-center tabular-nums"
                />
                <Button variant="ghost" size="icon" aria-label={`Quitar ${item.productName}`} onClick={() => remove(item.variantId)}>
                  <Trash2Icon />
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            {items.length} {items.length === 1 ? "producto" : "productos"} · <span className="tabular-nums">{units}</span> unidades
          </span>
          {wholesale ? (
            <span className="rounded-full bg-brand px-3 py-1 font-medium text-brand-foreground">Pedido mayorista</span>
          ) : (
            settings.wholesaleThreshold > 0 && (
              <span className="text-muted-foreground">
                Desde {settings.wholesaleThreshold} unidades el pedido es mayorista.
              </span>
            )
          )}
        </div>
      </section>

      <OrderFormCard items={items} settings={settings} />
    </div>
  );
}
