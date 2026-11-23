import Link from "next/link";
import { ArrowDownIcon, CupSodaIcon, GlassWaterIcon, MilkIcon, ReceiptTextIcon, SparklesIcon, type LucideIcon } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { buildCategoryBoard, groupByCategory, type BoardCell, type CategoryGroup } from "@/components/home/price-board-model";
import { PriceCell } from "@/components/home/price-cell";
import { CoffeeStains, MenuCard, MenuPill, ScriptAccent } from "@/components/site/menu-card";
import type { ProductDetail } from "@/lib/api";
import { priceRowCartItem } from "@/lib/catalog";
import { accentPhrases } from "@/lib/home-content";
import { formatArs } from "@/lib/pricing";

type Props = { products: ProductDetail[] };

const categoryIcons: Record<string, LucideIcon> = {
  especiales: SparklesIcon,
  extras: MilkIcon,
  refrescantes: GlassWaterIcon,
};

/** Three price columns leave no room for the name in a narrow card, so there the name sits above its prices. */
const gridByColumns: Record<number, string> = {
  1: "grid-cols-[minmax(0,1fr)_4.5rem]",
  2: "grid-cols-[minmax(0,1fr)_repeat(2,4.5rem)]",
  3: "grid-cols-3 @sm:grid-cols-[minmax(0,1fr)_repeat(3,4.5rem)]",
};

const priceText = (price: number | null) => (price !== null ? formatArs(price) : "Consultar");

/** Printed-menu price list: one card per category, one row per product, one column per size. */
export function PriceBoard({ products }: Props) {
  const priced = products.filter((p) => p.variants.length > 0);
  const groups = groupByCategory(priced);

  return (
    <section id="precios" aria-labelledby="precios-titulo" className="anchor-section relative overflow-hidden border-y border-latte bg-cream">
      <CoffeeStains />
      <div className="relative mx-auto max-w-5xl px-4 py-14 md:py-20">
        <Reveal>
          <MenuPill icon={ReceiptTextIcon}>Lista de precios</MenuPill>
          <h2 id="precios-titulo" className="title-display mt-4 text-4xl sm:text-5xl">
            Precios de hoy
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground text-pretty">
            Precio por presentación. Tocá un precio para sumarlo a tu pedido.
          </p>
        </Reveal>

        {groups.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-caramel/70 bg-ivory p-6 text-muted-foreground">
            La lista de precios no está disponible en este momento. Probá de nuevo en unos minutos o escribinos por WhatsApp.
          </p>
        ) : (
          <div className="mt-8 grid items-start gap-x-6 gap-y-6 md:grid-cols-2">
            {groups.map((group, i) => (
              <CategoryCard key={group.slug} group={group} index={i} />
            ))}
          </div>
        )}

        {groups.length > 0 && (
          <Reveal y={12} className="mt-10 flex flex-wrap items-center justify-between gap-4">
            <Link
              href="#catalogo"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-espresso px-7 text-[15px] font-bold tracking-wide text-ivory uppercase transition-colors hover:bg-roast focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Hacé tu pedido <ArrowDownIcon aria-hidden className="size-4" />
            </Link>
            <ScriptAccent className="-rotate-3 text-3xl">{accentPhrases.board}</ScriptAccent>
          </Reveal>
        )}
      </div>
    </section>
  );
}

function CategoryCard({ group, index }: { group: CategoryGroup<ProductDetail>; index: number }) {
  const { asColumns, headings, lines } = buildCategoryBoard(group.products);
  const grid = gridByColumns[headings.length];
  const stacks = headings.length === 3;

  return (
    <Stagger stagger={0.06}>
      <StaggerItem y={14}>
        <MenuCard title={group.name} icon={categoryIcons[group.slug] ?? CupSodaIcon} tone={index % 4 === 1 || index % 4 === 2 ? "caramel" : "espresso"}>
          <div className="@container">
            {asColumns && (
              <div aria-hidden className={`grid gap-x-1 pb-1 text-center text-xs font-semibold text-muted-foreground ${grid}`}>
                <span className={stacks ? "hidden @sm:block" : undefined} />
                {headings.map((h) => (
                  <span key={h.key}>{h.text}</span>
                ))}
              </div>
            )}
            <ul className="divide-y divide-dashed divide-caramel/60">
              {lines.map(({ product, cells, columnCells }, n) => (
                <li key={product.id} className={asColumns ? `grid items-center gap-x-1 py-1 ${grid}` : "py-2"}>
                  <p className={`min-w-0 py-1 text-sm leading-snug font-medium sm:text-[15px] ${asColumns && stacks ? "col-span-3 @sm:col-span-1" : ""}`}>
                    <span aria-hidden className="mr-1 text-muted-foreground tabular-nums">
                      {n + 1}-
                    </span>
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
        </MenuCard>
      </StaggerItem>
    </Stagger>
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
