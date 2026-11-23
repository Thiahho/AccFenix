"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import * as m from "motion/react-m";
import { CheckIcon, MessageCircleIcon, PlusIcon } from "lucide-react";
import { AvailabilityBadge } from "@/components/site/availability-badge";
import { notifyAdded } from "@/components/site/order-toast";
import { ProductImage } from "@/components/site/product-image";
import { Button } from "@/components/ui/button";
import type { ProductDetail } from "@/lib/api";
import { formatArs } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/lib/use-hydrated";
import { describeSelection, findVariant, initialSelection, isValueEnabled, select, type Selection } from "@/lib/variants";
import { buildVariantMessage, whatsappUrl } from "@/lib/whatsapp";
import { useCart } from "@/stores/cart";

type Props = { product: ProductDetail; phone: string };

const chip =
  "inline-flex h-11 min-w-12 items-center justify-center rounded-md border bg-background px-3 text-sm font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

/** One product: the visitor picks a presentation, sees its price and adds it to the order or asks by WhatsApp. */
export function ProductCard({ product, phone }: Props) {
  const { attributes, variants } = product;
  // Start on the first presentation so the price shows right away.
  const [selection, setSelection] = useState<Selection>(() => {
    const first = variants[0];
    if (!first) return initialSelection(attributes);
    return Object.fromEntries(attributes.map((a) => [a.id, a.values.find((v) => first.valueIds.includes(v.id))?.id]));
  });
  const add = useCart((s) => s.add);

  const variant = useMemo(() => findVariant(attributes, variants, selection), [attributes, variants, selection]);
  const label = describeSelection(attributes, selection);
  const hydrated = useHydrated();
  const cartQty = useCart((s) => s.items.find((i) => i.variantId === variant?.id)?.qty ?? 0);
  const inCart = hydrated ? cartQty : 0;
  const cover = product.media.find((m) => m.type === "image")?.url;

  function handleAdd() {
    if (!variant) return;
    add(
      {
        variantId: variant.id,
        productSlug: product.slug,
        productName: product.name,
        categoryName: product.category.name,
        valuesLabel: label,
        availability: variant.availability,
        retailPrice: variant.retailPrice,
      },
      1,
    );
    notifyAdded({ title: product.name, detail: label, availability: variant.availability, imageUrl: cover });
  }

  return (
    <m.article
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(60_30_10/0.05),0_8px_24px_rgb(60_30_10/0.06)] transition-shadow duration-300 hover:shadow-[0_2px_4px_rgb(60_30_10/0.06),0_18px_40px_rgb(60_30_10/0.14)]",
        inCart > 0 && "border-brand ring-3 ring-brand/15",
      )}
    >
      <ProductImage src={cover} alt={product.name} className="aspect-[4/3] rounded-none" sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw" />

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="title-display text-2xl">
            <Link href={`/producto/${product.slug}`} className="rounded-sm hover:text-brand focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              {product.name}
            </Link>
          </h3>
          {variant && <AvailabilityBadge availability={variant.availability} />}
        </div>

        {attributes.map((attr) => (
          <fieldset key={attr.id}>
            <legend className="mb-2 text-sm font-medium text-muted-foreground">{attr.name}</legend>
            <div className="flex flex-wrap gap-2">
              {attr.values.map((value) => {
                const selected = selection[attr.id] === value.id;
                const enabled = isValueEnabled(variants, selection, attr.id, value.id);
                return (
                  <button
                    key={value.id}
                    type="button"
                    aria-pressed={selected}
                    disabled={!enabled}
                    onClick={() => setSelection((s) => select(attributes, variants, s, attr.id, value.id))}
                    className={cn(
                      chip,
                      selected ? "border-brand bg-brand text-brand-foreground" : "hover:border-brand/60 hover:bg-brand-soft",
                      !enabled && "cursor-not-allowed opacity-40 line-through hover:border-border hover:bg-background",
                    )}
                  >
                    {value.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        <div aria-live="polite" className="rounded-lg bg-brand-soft/60 px-3 py-2.5">
          {variant ? (
            <>
              <p className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-muted-foreground">Precio</span>
                <span className="font-heading text-2xl font-extrabold tabular-nums">
                  {variant.retailPrice !== null ? formatArs(variant.retailPrice) : "Consultar"}
                </span>
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Elegí una presentación para ver el precio.</p>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-2">
          {/* Tap feedback only; the wrapper is a plain block so the button keeps its full width. */}
          <m.div whileTap={variant ? { scale: 0.97 } : undefined} className="flex flex-col">
            <Button
              type="button"
              className={cn("h-auto min-h-11 whitespace-normal py-2 text-center leading-tight", inCart > 0 && "bg-charcoal hover:bg-charcoal/90")}
              disabled={!variant}
              onClick={handleAdd}
            >
              {inCart > 0 ? (
                <>
                  <m.span key="in" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex">
                    <CheckIcon aria-hidden />
                  </m.span>
                  Sumado · {inCart} en el pedido
                </>
              ) : (
                <>
                  <PlusIcon aria-hidden /> Sumar al pedido
                </>
              )}
            </Button>
          </m.div>
          {phone && variant ? (
            <Button asChild variant="outline" className="h-auto min-h-11 whitespace-normal py-2 text-center leading-tight">
              <a href={whatsappUrl(phone, buildVariantMessage(product.name, label))} target="_blank" rel="noopener noreferrer">
                <MessageCircleIcon aria-hidden /> Pedir por WhatsApp
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </m.article>
  );
}
