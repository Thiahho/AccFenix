import Link from "next/link";
import { ArrowDownIcon } from "lucide-react";
import type { ProductDetail } from "@/lib/api";
import { priceRows, splitProductName } from "@/lib/catalog";
import { formatArs } from "@/lib/pricing";

type Props = { products: ProductDetail[]; threshold: number };

/** Dark price list after the "HUEVOS | N°1" story: one block per product, one row per presentation. */
export function PriceBoard({ products, threshold }: Props) {
  const priced = products.filter((p) => p.variants.length > 0);

  return (
    <section id="precios" aria-labelledby="precios-titulo" className="anchor-section bg-egg-tray text-cream">
      <div className="mx-auto max-w-3xl px-4 py-14 md:py-20">
        <p className="eyebrow text-yolk-light">Lista de precios</p>
        <h2 id="precios-titulo" className="title-display mt-3 text-4xl sm:text-5xl">
          Precios de hoy
        </h2>
        <p className="mt-3 max-w-xl text-cream/80 text-pretty">
          Precio minorista por presentación.
          {threshold > 0 && <> Desde {threshold} unidades en el mismo pedido se aplica el precio mayorista.</>}
        </p>

        {priced.length === 0 ? (
          <p className="mt-10 rounded-xl border border-cream/20 p-6 text-cream/80">
            La lista de precios no está disponible en este momento. Probá de nuevo en unos minutos o escribinos por WhatsApp.
          </p>
        ) : (
          <div className="mt-10 flex flex-col gap-12">
            {priced.map((product) => (
              <BoardBlock key={product.id} product={product} />
            ))}
          </div>
        )}

        {priced.length > 0 && (
          <Link
            href="#catalogo"
            className="mt-12 inline-flex h-12 items-center gap-2 rounded-full bg-cream px-7 text-[15px] font-bold tracking-wide text-charcoal uppercase transition-colors hover:bg-white focus-visible:ring-3 focus-visible:ring-yolk-light focus-visible:outline-none"
          >
            Hacé tu pedido <ArrowDownIcon aria-hidden className="size-4" />
          </Link>
        )}
      </div>
    </section>
  );
}

function BoardBlock({ product }: { product: ProductDetail }) {
  const { main, grade } = splitProductName(product.name);
  const rows = priceRows(product);

  return (
    <article aria-label={product.name}>
      <h3 className="title-display flex flex-wrap items-center justify-center gap-x-4 text-center text-4xl sm:text-6xl">
        <span>{main}</span>
        {grade && (
          <>
            <span aria-hidden className="h-[0.8em] w-0.5 bg-cream" />
            <span>{grade}</span>
          </>
        )}
      </h3>
      <dl className="mt-6 flex flex-col gap-3 sm:gap-4">
        {rows.map((row) => (
          <div key={row.variantId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4">
            <dt className="flex items-center gap-4">
              <span className="title-display text-2xl sm:text-3xl">{row.label}</span>
              <span aria-hidden className="ml-auto hidden h-0.5 w-14 shrink-0 bg-cream/70 sm:block" />
            </dt>
            <dd className="flex flex-col items-end gap-1">
              <span className="bg-brand px-3 py-1.5 font-heading text-xl font-extrabold text-brand-foreground tabular-nums shadow-[0_6px_18px_rgb(0_0_0/0.35)] sm:text-3xl">
                {row.retailPrice !== null ? formatArs(row.retailPrice) : "Consultar"}
              </span>
              {row.wholesalePrice !== null && (
                <span className="text-xs text-cream/75 tabular-nums sm:text-sm">Mayorista {formatArs(row.wholesalePrice)}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
