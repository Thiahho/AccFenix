import Link from "next/link";
import { ArrowDownIcon } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { PriceRow } from "@/components/home/price-row";
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
        <Reveal>
          <p className="eyebrow text-yolk-light">Lista de precios</p>
          <h2 id="precios-titulo" className="title-display mt-3 text-4xl sm:text-5xl">
            Precios de hoy
          </h2>
          <p className="mt-3 max-w-xl text-cream/80 text-pretty">
            Precio minorista por presentación.
            {threshold > 0 && <> Desde {threshold} unidades en el mismo pedido se aplica el precio mayorista.</>}
          </p>
        </Reveal>

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
          <Reveal y={12} className="mt-12">
            <Link
              href="#catalogo"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-cream px-7 text-[15px] font-bold tracking-wide text-charcoal uppercase transition-colors hover:bg-white focus-visible:ring-3 focus-visible:ring-yolk-light focus-visible:outline-none"
            >
              Hacé tu pedido <ArrowDownIcon aria-hidden className="size-4" />
            </Link>
          </Reveal>
        )}
      </div>
    </section>
  );
}

function BoardBlock({ product }: { product: ProductDetail }) {
  const { main, grade } = splitProductName(product.name);
  const rows = priceRows(product);

  return (
    <Stagger as="article" aria-label={product.name} stagger={0.1}>
      <StaggerItem>
        <h3 className="title-display flex flex-wrap items-center justify-center gap-x-4 text-center text-4xl sm:text-6xl">
          <span>{main}</span>
          {grade && (
            <>
              <span aria-hidden className="h-[0.8em] w-0.5 bg-cream" />
              <span>{grade}</span>
            </>
          )}
        </h3>
      </StaggerItem>
      <ul className="mt-6 flex flex-col gap-1 sm:gap-2">
        {rows.map((row) => (
          <StaggerItem as="li" key={row.variantId} y={12}>
            <PriceRow
              productName={product.name}
              label={row.label}
              price={row.retailPrice !== null ? formatArs(row.retailPrice) : "Consultar"}
              wholesale={row.wholesalePrice !== null ? formatArs(row.wholesalePrice) : null}
            />
          </StaggerItem>
        ))}
      </ul>
    </Stagger>
  );
}
