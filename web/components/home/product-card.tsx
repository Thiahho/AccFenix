"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FlameIcon, ShoppingBagIcon } from "lucide-react";
import { IcedCup } from "@/components/home/iced-cup";
import { AddonPicker } from "@/components/site/addon-picker";
import { notifyAdded } from "@/components/site/order-toast";
import { ProductFacts, RatingSummary } from "@/components/site/product-facts";
import { ProductImage } from "@/components/site/product-image";
import { QtyStepper } from "@/components/site/qty-stepper";
import { Button } from "@/components/ui/button";
import type { ProductDetail } from "@/lib/api";
import { priceRows } from "@/lib/catalog";
import { formatArs, unitPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { describeSelection, findVariant, isValueEnabled, select, withAddons, type Selection } from "@/lib/variants";
import { MAX_QTY, useCart } from "@/stores/cart";

/** Starts on the first priced combination, so the card always shows a real price and total. */
function firstSelection({ attributes, variants }: ProductDetail, rows: ReturnType<typeof priceRows>): Selection {
  const row = rows.find((r) => r.retailPrice !== null) ?? rows[0];
  const variant = variants.find((v) => v.id === row?.variantId);
  if (!variant) return {};
  return Object.fromEntries(attributes.map((a) => [a.id, a.values.find((v) => variant.valueIds.includes(v.id))?.id]));
}

/** One product of the menu: photo, real rating and orders, tasting data, size, quantity, total and the add action. */
export function ProductCard({ product, mostOrdered }: { product: ProductDetail; mostOrdered: boolean }) {
  const { attributes, variants } = product;
  const rows = useMemo(() => priceRows(product), [product]);
  const [selection, setSelection] = useState<Selection>(() => firstSelection(product, rows));
  const [qty, setQty] = useState(1);
  const [addonIds, setAddonIds] = useState<number[]>([]);
  const add = useCart((s) => s.add);

  const variant = findVariant(attributes, variants, selection);
  const addons = (product.addons ?? []).filter((a) => addonIds.includes(a.id));
  const price = variant ? unitPrice({ qty, retailPrice: variant.retailPrice, addons }) : null;
  const cover = product.media.find((m) => m.type === "image")?.url ?? null;
  const showsOptionPrice = attributes.length === 1;

  function handleAdd() {
    if (!variant) return;
    const valuesLabel = withAddons(describeSelection(attributes, selection), addons);
    add(
      {
        variantId: variant.id,
        productSlug: product.slug,
        productName: product.name,
        categoryName: product.category.name,
        valuesLabel,
        availability: variant.availability,
        retailPrice: variant.retailPrice,
        addons,
      },
      qty,
    );
    notifyAdded({ title: product.name, detail: `${qty} u. · ${valuesLabel}`, availability: variant.availability, imageUrl: cover });
  }

  return (
    <article aria-labelledby={`producto-${product.id}`} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_12px_32px_rgb(0_0_0/0.28)]">
      <div className="relative">
        {cover ? (
          <ProductImage src={cover} alt={product.name} className="aspect-[4/3] rounded-none" sizes="(min-width: 1280px) 30vw, (min-width: 640px) 46vw, 100vw" />
        ) : (
          <div className="poster-ink relative grid aspect-[4/3] place-items-center overflow-hidden">
            <div aria-hidden className="absolute inset-[6%] rounded-full bg-[radial-gradient(circle,color-mix(in_oklch,var(--poster-gold)_30%,transparent),transparent_68%)]" />
            <IcedCup className="relative h-[78%] w-auto drop-shadow-[0_16px_24px_rgb(0_0_0/0.55)]" />
          </div>
        )}
        {mostOrdered && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
            <FlameIcon aria-hidden className="size-3.5" /> El más pedido
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <RatingSummary stats={product.stats} />
        <h4 id={`producto-${product.id}`} className="poster-display text-xl leading-[1.2]">
          <Link href={`/producto/${product.slug}`} className="underline-offset-4 hover:underline">
            {product.name}
          </Link>
        </h4>
        {product.description && <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>}
        <ProductFacts product={product} />

        <div className="mt-auto flex flex-col gap-3 pt-1">
          {attributes.map((attr) => (
            <fieldset key={attr.id}>
              <legend className="mb-1.5 text-xs font-semibold text-muted-foreground">{attr.name}</legend>
              <div className={cn("grid gap-1.5", showsOptionPrice ? "grid-cols-1" : "grid-cols-2")}>
                {attr.values.map((value) => {
                  const selected = selection[attr.id] === value.id;
                  const enabled = isValueEnabled(variants, selection, attr.id, value.id);
                  const optionPrice = showsOptionPrice ? variants.find((v) => v.valueIds.includes(value.id))?.retailPrice : undefined;
                  return (
                    <button
                      key={value.id}
                      type="button"
                      aria-pressed={selected}
                      disabled={!enabled}
                      onClick={() => setSelection((s) => select(attributes, variants, s, attr.id, value.id))}
                      className={cn(
                        "flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 text-left text-sm font-semibold transition-colors",
                        selected ? "border-primary bg-primary/12" : "border-border hover:bg-oat",
                        !enabled && "cursor-not-allowed opacity-40 line-through hover:bg-transparent",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span aria-hidden className={cn("grid size-4 shrink-0 place-items-center rounded-full border", selected ? "border-primary" : "border-input")}>
                          {selected && <span className="size-2 rounded-full bg-primary" />}
                        </span>
                        {value.label}
                      </span>
                      {showsOptionPrice && (
                        <span className="poster-price shrink-0 text-sm text-caramel-deep">{optionPrice != null ? formatArs(optionPrice) : "Consultar"}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <AddonPicker addons={product.addons ?? []} selected={addonIds} onChange={setAddonIds} />

          <div className="flex items-center justify-between gap-3">
            <QtyStepper label={`Cantidad de ${product.name}`} value={qty} max={MAX_QTY} onChange={setQty} size="sm" className="overflow-hidden rounded-full" />
            <p className="text-right">
              <span className="block text-[11px] text-muted-foreground">Total</span>
              <span className="poster-price text-lg whitespace-nowrap">{price !== null ? formatArs(price * qty) : "Consultar"}</span>
            </p>
          </div>

          <Button type="button" size="lg" className="w-full gap-2" disabled={!variant} onClick={handleAdd}>
            <ShoppingBagIcon aria-hidden className="size-4" /> Agregar al pedido
          </Button>
        </div>
      </div>
    </article>
  );
}
