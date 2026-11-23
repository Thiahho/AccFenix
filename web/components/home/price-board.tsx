import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { buildCategoryBoard, groupByCategory, type BoardCell, type CategoryGroup } from "@/components/home/price-board-model";
import { PriceCell } from "@/components/home/price-cell";
import { Starburst } from "@/components/site/starburst";
import type { ProductDetail } from "@/lib/api";
import { priceRowCartItem } from "@/lib/catalog";
import { boardPhrase } from "@/lib/home-content";
import { formatArs } from "@/lib/pricing";
import { cn } from "@/lib/utils";

type Props = { products: ProductDetail[] };

/** Solid block behind each category name, in menu order. Every pair meets AA for large text or better. */
const bands = [
  "bg-espresso text-ivory",
  "bg-latte text-espresso",
  "bg-caramel-deep text-ivory",
  "bg-roast text-cream",
];

/** Three price columns leave no room for the name on a phone, so there the name sits above its prices. */
const gridByColumns: Record<number, string> = {
  1: "grid-cols-[minmax(0,1fr)_5.5rem] sm:grid-cols-[minmax(0,1fr)_7.5rem]",
  2: "grid-cols-[minmax(0,1fr)_repeat(2,5rem)] sm:grid-cols-[minmax(0,1fr)_repeat(2,7.5rem)]",
  3: "grid-cols-3 @lg:grid-cols-[minmax(0,1fr)_repeat(3,6rem)]",
};

const priceText = (price: number | null) => (price !== null ? formatArs(price) : "Consultar");

/** The menu as a printed price board: one full-width band per category, one ruled row per product, one column per size. */
export function PriceBoard({ products }: Props) {
  const priced = products.filter((p) => p.variants.length > 0);
  const groups = groupByCategory(priced);

  return (
    <section id="precios" aria-labelledby="precios-titulo" className="anchor-section relative bg-ivory">
      {/* Links shared before the board became the only ordering section still land here. */}
      <span id="catalogo" aria-hidden className="anchor-section absolute top-0" />

      <div className="relative overflow-hidden px-4 pt-10 pb-6 sm:px-6 lg:px-8 lg:pt-16 lg:pb-10">
        <p className="poster-label text-caramel-deep">Lista de precios</p>
        <h2 id="precios-titulo" className="poster-display poster-section-title mt-2">
          Precios de hoy
        </h2>
        <p className="mt-3 max-w-xl text-pretty text-muted-foreground">Precio por presentación. Tocá un precio para sumarlo a tu pedido.</p>
        <Starburst
          lines={["Good", "coffee"]}
          spikes={15}
          fill="var(--espresso)"
          ink="var(--ivory)"
          className="absolute top-3 right-3 hidden w-40 rotate-12 md:block lg:right-10 lg:w-52"
        />
      </div>

      {groups.length === 0 ? (
        <p className="border-y-[3px] border-espresso px-4 py-8 text-muted-foreground sm:px-6 lg:px-8">
          La lista de precios no está disponible en este momento. Probá de nuevo en unos minutos o escribinos por WhatsApp.
        </p>
      ) : (
        <div className="border-t-[3px] border-espresso">
          {groups.map((group, i) => (
            <CategoryBand key={group.slug} group={group} band={bands[i % bands.length]} />
          ))}
        </div>
      )}

      {groups.length > 0 && (
        <Link
          href="/pedido"
          className="poster-focus-inset group flex min-h-24 flex-wrap items-center justify-between gap-x-6 gap-y-1 bg-espresso px-4 py-5 text-ivory transition-colors hover:bg-roast sm:px-6 lg:px-8"
          style={{ "--poster-focus": "var(--cream)" } as React.CSSProperties}
        >
          <span className="poster-display text-3xl text-latte sm:text-5xl">{boardPhrase}</span>
          <span className="poster-display inline-flex items-center gap-3 text-2xl sm:text-3xl">
            Ver mi pedido
            <ArrowRightIcon aria-hidden className="size-6 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" />
          </span>
        </Link>
      )}
    </section>
  );
}

function CategoryBand({ group, band }: { group: CategoryGroup<ProductDetail>; band: string }) {
  const { asColumns, headings, lines } = buildCategoryBoard(group.products);
  const grid = gridByColumns[headings.length];
  const stacks = headings.length === 3;

  return (
    <article aria-labelledby={`banda-${group.slug}`} className="grid border-b-[3px] border-espresso lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <h3
        id={`banda-${group.slug}`}
        className={cn("poster-display flex items-end px-4 py-4 text-5xl leading-[1.25] sm:px-6 sm:text-6xl sm:leading-[1.25] lg:px-8 lg:py-8 xl:text-7xl xl:leading-[1.25]", band)}
      >
        {group.name}
      </h3>

      <div className="@container min-w-0 px-4 pb-1 sm:px-6 lg:px-8 lg:py-4">
        {asColumns && (
          <div aria-hidden className={cn("poster-label grid gap-x-1 border-b-[3px] border-espresso pt-3 pb-2 text-center", grid)}>
            <span className={cn("text-left", stacks && "hidden @lg:block")}>Producto</span>
            {headings.map((h) => (
              <span key={h.key}>{h.text}</span>
            ))}
          </div>
        )}
        <ul className="divide-y-2 divide-espresso">
          {lines.map(({ product, cells, columnCells }) => (
            <li key={product.id} className={asColumns ? cn("grid items-center gap-x-1 py-1", grid) : "py-2"}>
              <p className={cn("min-w-0 py-1 pr-2 text-base leading-tight font-bold sm:text-xl", asColumns && stacks && "col-span-3 @lg:col-span-1")}>
                {product.name}
              </p>
              {asColumns ? (
                columnCells.map((cell, c) =>
                  cell ? <Cell key={cell.row.variantId} product={product} cell={cell} /> : <span key={headings[c].key} />,
                )
              ) : (
                <div className="mt-1 flex flex-wrap gap-2">
                  {cells.map((cell) => (
                    <Cell key={cell.row.variantId} product={product} cell={cell} caption={cell.caption} />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function Cell({ product, cell, caption }: { product: ProductDetail; cell: BoardCell; caption?: string }) {
  const cover = product.media.find((m) => m.type === "image")?.url ?? null;
  return (
    <PriceCell
      item={priceRowCartItem(product, cell.row.variantId)}
      imageUrl={cover}
      productName={product.name}
      label={cell.label}
      price={priceText(cell.row.retailPrice)}
      caption={caption}
    />
  );
}
