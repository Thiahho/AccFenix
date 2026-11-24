import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { groupByCategory } from "@/components/home/price-board-model";
import { ProductCard } from "@/components/home/product-card";
import type { ProductDetail } from "@/lib/api";
import { boardPhrase } from "@/lib/home-content";

type Props = { products: ProductDetail[] };

/** The menu as a product grid, one block per category. Only a product with real paid orders can be "the most ordered". */
export function PriceBoard({ products }: Props) {
  const priced = products.filter((p) => p.variants.length > 0);
  const groups = groupByCategory(priced);
  const topOrders = Math.max(0, ...priced.map((p) => p.stats.timesOrdered));
  const mostOrderedId = topOrders > 0 ? priced.find((p) => p.stats.timesOrdered === topOrders)?.id : undefined;

  return (
    <section id="precios" aria-labelledby="precios-titulo" className="anchor-section relative bg-ivory">
      {/* Links shared before the board became the only ordering section still land here. */}
      <span id="catalogo" aria-hidden className="anchor-section absolute top-0" />

      <div className="mx-auto max-w-7xl px-4 pt-12 pb-6 text-center sm:px-6 lg:px-8 lg:pt-20 lg:pb-10">
        <p className="poster-hand text-2xl text-caramel-deep">Lista de precios</p>
        <h2 id="precios-titulo" className="poster-display poster-section-title mt-2">
          Precios de hoy
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">Elegí tamaño y cantidad, mirá el total y sumalo a tu pedido.</p>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-12 sm:px-6 lg:gap-10 lg:px-8 lg:pb-20">
        {groups.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">
            La lista de precios no está disponible en este momento. Probá de nuevo en unos minutos o escribinos por WhatsApp.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.slug} role="group" aria-labelledby={`banda-${group.slug}`}>
              <h3 id={`banda-${group.slug}`} className="poster-display mb-4 text-2xl text-caramel-deep sm:text-3xl">
                {group.name}
              </h3>
              {/*
               * Phones: one swipeable row per category (the next card peeks out), so the list does not become one long
               * column. From `sm` up it is the usual grid. The bottom padding keeps the card shadow from being clipped.
               */}
              <div className="-mx-4 flex snap-x snap-proximity scroll-px-4 gap-4 overflow-x-auto px-4 pb-6 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:gap-5 xl:grid-cols-3">
                {group.products.map((product) => (
                  <div key={product.id} className="grid w-[85%] max-w-sm shrink-0 snap-start sm:w-auto sm:max-w-none">
                    <ProductCard product={product} mostOrdered={product.id === mostOrderedId} />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {groups.length > 0 && (
          <Link
            href="/pedido"
            className="poster-ink poster-focus-inset group flex min-h-24 flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border border-border px-5 py-6 transition-colors hover:bg-roast sm:px-8"
          >
            <span className="poster-hand text-3xl sm:text-5xl">{boardPhrase}</span>
            <span className="inline-flex items-center gap-2 font-bold text-latte">
              Ver mi pedido
              <ArrowRightIcon aria-hidden className="size-5 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" />
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}
