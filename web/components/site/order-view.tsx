"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2Icon } from "lucide-react";
import { AvailabilityBadge } from "@/components/site/availability-badge";
import { OrderFormCard } from "@/components/site/order-form";
import { Button } from "@/components/ui/button";
import { QtyStepper } from "@/components/site/qty-stepper";
import { api } from "@/lib/api";
import { useHydrated } from "@/lib/use-hydrated";
import { cartTotals, formatArs, lineSubtotal, unitPrice } from "@/lib/pricing";
import { unitsLabel } from "@/lib/qty";
import { MAX_QTY, totalUnits, useCart } from "@/stores/cart";

export function OrderView() {
  const hydrated = useHydrated();
  const { items, setQty, remove, sync } = useCart();
  const [removedCount, setRemovedCount] = useState(0);
  const [refreshFailed, setRefreshFailed] = useState(false);
  // Al entrar, refresca disponibilidad y precios, y quita variantes que ya no existen.
  // The prices stored with the cart are only a snapshot; the ones shown and sent come from this refresh.
  useEffect(() => {
    const current = useCart.getState().items;
    if (current.length === 0) return;
    api
      .variantStatus(current.map((i) => i.variantId))
      .then((statuses) => {
        sync(statuses);
        setRemovedCount(current.length - useCart.getState().items.length);
      })
      .catch(() => setRefreshFailed(true));
  }, [sync]);

  if (!hydrated) return <div className="mt-8 h-40 bg-muted motion-safe:animate-pulse" />;

  // The cart is already empty here: it is cleared as soon as the order is stored.
  if (items.length === 0) {
    return (
      <div className="mt-8 border-[3px] border-espresso p-8 text-center sm:p-10">
        <p className="poster-display text-4xl">Tu pedido está vacío</p>
        <p className="mt-1 text-sm text-muted-foreground">Agregá cafés desde la carta.</p>
        <Button asChild className="mt-6">
          <Link href="/#precios">Ver la carta</Link>
        </Button>
      </div>
    );
  }

  const units = totalUnits(items);
  const totals = cartTotals(items);
  const hasPrices = totals.pricedLines > 0;

  return (
    <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
      <section aria-labelledby="productos">
        <h2 id="productos" className="sr-only">Productos</h2>
        {removedCount > 0 && (
          <p role="status" className="mb-4 border-2 border-amber-900 bg-amber-50 p-3 text-sm text-amber-900">
            Quitamos {removedCount} {removedCount === 1 ? "producto que ya no está" : "productos que ya no están"} en el catálogo.
          </p>
        )}
        {refreshFailed && hasPrices && (
          <p role="status" className="mb-4 border-2 border-amber-900 bg-amber-50 p-3 text-sm text-amber-900">
            No pudimos actualizar los precios. Los confirmamos por WhatsApp al recibir tu pedido.
          </p>
        )}
        <ul className="divide-y-2 divide-espresso border-y-[3px] border-espresso">
          {items.map((item) => {
            const price = unitPrice(item);
            const subtotal = lineSubtotal(item);
            return (
            <li key={item.variantId} className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4">
              {/* Full width on phones, so the size stays on one line above the controls. */}
              <div className="w-full min-w-0 sm:w-auto sm:flex-1">
                <Link href={`/producto/${item.productSlug}`} className="poster-display inline-flex min-h-11 items-center text-2xl leading-[1.2] underline-offset-4 hover:underline">
                  {item.productName}
                </Link>
                <p className="text-sm text-muted-foreground">{item.valuesLabel}</p>
                <AvailabilityBadge availability={item.availability} className="mt-2" />
              </div>
              <div className="flex items-center gap-2">
                <QtyStepper
                  id={`qty-${item.variantId}`}
                  label={`Cantidad de ${item.productName}`}
                  value={item.qty}
                  max={MAX_QTY}
                  onChange={(qty) => setQty(item.variantId, qty)}
                />
                <Button variant="ghost" size="icon" aria-label={`Quitar ${item.productName}`} onClick={() => remove(item.variantId)}>
                  <Trash2Icon />
                </Button>
              </div>
              <div className="ml-auto text-right text-sm tabular-nums sm:ml-0 sm:w-36">
                {price !== null && subtotal !== null ? (
                  <>
                    <p className="poster-price text-2xl">{formatArs(subtotal)}</p>
                    <p className="text-muted-foreground">{formatArs(price)} c/u</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">Consultar</p>
                )}
              </div>
            </li>
            );
          })}
        </ul>
        {hasPrices && (
          <div className="poster-ink mt-4 p-4">
            <p className="flex items-baseline justify-between gap-3">
              <span className="poster-label">{totals.partial ? "Total parcial" : "Total"}</span>
              <span className="poster-price text-4xl">{formatArs(totals.total)}</span>
            </p>
            <p className="mt-1 text-sm text-cream">
              Precio final, sin envío.
              {totals.partial && " Los productos sin precio se cotizan por WhatsApp."}
            </p>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            {items.length} {items.length === 1 ? "producto" : "productos"} · <span className="tabular-nums">{unitsLabel(units)}</span>
          </span>
        </div>
      </section>

      <OrderFormCard items={items} />
    </div>
  );
}
