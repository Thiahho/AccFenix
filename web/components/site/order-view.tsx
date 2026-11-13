"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircleIcon, Trash2Icon } from "lucide-react";
import { AvailabilityBadge } from "@/components/site/availability-badge";
import { OrderFormCard, type PlacedOrder } from "@/components/site/order-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, type PublicSettings } from "@/lib/api";
import { useHydrated } from "@/lib/use-hydrated";
import { cartTotals, formatArs, lineSubtotal, unitPrice } from "@/lib/pricing";
import { MAX_QTY, totalUnits, useCart } from "@/stores/cart";

export function OrderView({ settings }: { settings: PublicSettings }) {
  const hydrated = useHydrated();
  const { items, setQty, remove, sync } = useCart();
  const [removedCount, setRemovedCount] = useState(0);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

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

  if (!hydrated) return <div className="mt-8 h-40 animate-pulse rounded-xl bg-muted" />;

  // The cart is already empty here: it is cleared as soon as the order is stored.
  if (placed) {
    return (
      <div role="status" className="mt-8 rounded-xl border bg-brand-soft/50 p-8 text-center">
        <p className="eyebrow text-brass">Pedido #{placed.number}</p>
        <h2 className="mt-2 text-xl font-semibold">¡Registramos tu pedido!</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Abrimos WhatsApp con el detalle. Enviá el mensaje y te contactamos para confirmar el pedido y coordinar la entrega.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <a href={placed.whatsappHref} target="_blank" rel="noopener noreferrer">
              <MessageCircleIcon aria-hidden /> Abrir WhatsApp
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Volver al catálogo</Link>
          </Button>
        </div>
      </div>
    );
  }

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
  const totals = cartTotals(items, settings.wholesaleThreshold);
  const { wholesale } = totals;
  const hasPrices = totals.pricedLines > 0;

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
      <section aria-labelledby="productos">
        <h2 id="productos" className="sr-only">Productos</h2>
        {removedCount > 0 && (
          <p role="status" className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            Quitamos {removedCount} {removedCount === 1 ? "producto que ya no está" : "productos que ya no están"} en el catálogo.
          </p>
        )}
        {refreshFailed && hasPrices && (
          <p role="status" className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            No pudimos actualizar los precios. Los confirmamos por WhatsApp al recibir tu pedido.
          </p>
        )}
        <ul className="divide-y rounded-xl border">
          {items.map((item) => {
            const price = unitPrice(item, wholesale);
            const subtotal = lineSubtotal(item, wholesale);
            return (
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
              <div className="w-full text-sm tabular-nums sm:w-36 sm:text-right">
                {price !== null && subtotal !== null ? (
                  <>
                    <p className="font-medium">{formatArs(subtotal)}</p>
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
          <div className="mt-4 rounded-xl border bg-brand-soft/50 p-4">
            <p className="flex items-baseline justify-between gap-3">
              <span className="font-medium">{totals.partial ? "Total parcial" : "Total"}</span>
              <span className="text-2xl font-semibold tabular-nums">{formatArs(totals.total)}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Con precios {wholesale ? "mayoristas" : "minoristas"}, sin envío.
              {totals.partial && " Los productos sin precio se cotizan por WhatsApp."}
            </p>
          </div>
        )}
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

      <OrderFormCard items={items} settings={settings} onPlaced={setPlaced} />
    </div>
  );
}
