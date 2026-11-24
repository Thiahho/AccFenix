"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AddonPicker } from "@/components/site/addon-picker";
import { AvailabilityBadge } from "@/components/site/availability-badge";
import { notifyAdded } from "@/components/site/order-toast";
import { ProductFacts, RatingSummary } from "@/components/site/product-facts";
import { ProductGallery } from "@/components/site/product-gallery";
import { Button } from "@/components/ui/button";
import { QtyStepper } from "@/components/site/qty-stepper";
import type { ProductDetail } from "@/lib/api";
import { formatArs, unitPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { describeSelection, findVariant, initialSelection, isValueEnabled, select, withAddons, type Selection } from "@/lib/variants";
import { MAX_QTY, useCart } from "@/stores/cart";

export function VariantPicker({ product }: { product: ProductDetail }) {
  const { attributes, variants } = product;
  const [selection, setSelection] = useState<Selection>(() => initialSelection(attributes));
  const [qty, setQty] = useState(1);
  const [addonIds, setAddonIds] = useState<number[]>([]);
  const add = useCart((s) => s.add);

  const variant = useMemo(() => findVariant(attributes, variants, selection), [attributes, variants, selection]);
  const missing = attributes.filter((a) => selection[a.id] === undefined).map((a) => a.name.toLowerCase());
  const selectedValueIds = Object.values(selection).filter((v): v is number => v !== undefined);
  const addons = (product.addons ?? []).filter((a) => addonIds.includes(a.id));
  const price = variant ? unitPrice({ qty, retailPrice: variant.retailPrice, addons }) : null;
  const valuesLabel = withAddons(describeSelection(attributes, selection), addons);

  function handleAdd() {
    if (!variant) return;
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
    const images = product.media.filter((m) => m.type === "image");
    const image =
      images.find((m) => m.attributeValueId !== null && selectedValueIds.includes(m.attributeValueId)) ??
      images.find((m) => m.attributeValueId === null);
    const colorHex = attributes.flatMap((a) => a.values).find((v) => v.colorHex && selectedValueIds.includes(v.id))?.colorHex;
    notifyAdded({
      title: product.name,
      detail: `${qty} u. · ${valuesLabel}`,
      availability: variant.availability,
      imageUrl: image?.url,
      colorHex,
    });
  }

  return (
    <div className="grid border-b border-border md:grid-cols-2">
      <div className="border-b border-border md:border-r md:border-b-0">
        <ProductGallery media={product.media} name={product.name} selectedValueIds={selectedValueIds} />
      </div>

      <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <p className="poster-hand text-2xl text-caramel-deep">
          <Link href={`/catalogo/${product.category.slug}`} className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline">{product.category.name}</Link>
        </p>
        <h1 className="poster-display mt-1 text-3xl leading-[1.2] text-balance sm:text-4xl sm:leading-[1.2] xl:text-5xl xl:leading-[1.2]">{product.name}</h1>
        <div className="mt-2"><RatingSummary stats={product.stats} /></div>
        {product.description && <p className="mt-3 text-muted-foreground">{product.description}</p>}
        <div className="mt-4 max-w-md"><ProductFacts product={product} /></div>

        <div className="mt-8 space-y-6">
          {attributes.map((attr) => (
            <fieldset key={attr.id}>
              <legend className="poster-label mb-2">
                {attr.name}
                {selection[attr.id] !== undefined && (
                  <span className="ml-2 font-semibold tracking-normal text-muted-foreground normal-case">
                    {attr.values.find((v) => v.id === selection[attr.id])?.label}
                  </span>
                )}
              </legend>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-2">
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
                        "inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-bold tabular-nums transition-colors",
                        selected ? "border-primary bg-primary text-primary-foreground" : "hover:bg-oat",
                        !enabled && "cursor-not-allowed opacity-40 line-through hover:bg-transparent",
                      )}
                    >
                      {value.colorHex && (
                        <span aria-hidden className="size-4 border border-black/20" style={{ backgroundColor: value.colorHex }} />
                      )}
                      {value.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="mt-6">
          <AddonPicker addons={product.addons ?? []} selected={addonIds} onChange={setAddonIds} />
        </div>

        <div className="mt-6 border border-border bg-cream p-4">
          <div className="flex min-h-6 items-center justify-between gap-3 text-sm">
            {variant ? (
              <>
                <span className="text-muted-foreground">Estado de esta combinación</span>
                <AvailabilityBadge availability={variant.availability} />
              </>
            ) : (
              <span className="text-muted-foreground">
                {variants.length === 0 ? "Este producto no tiene combinaciones disponibles." : `Elegí ${missing.join(", ")} para continuar.`}
              </span>
            )}
          </div>

          {variant && (
            <div className="mt-3 border-t-2 pt-3">
              <p className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-muted-foreground">Precio por unidad</span>
                <span className="poster-price text-4xl">
                  {price !== null ? formatArs(price) : "Consultar"}
                </span>
              </p>
            </div>
          )}

          {/* Stacked on phones so the stepper and the button never overflow a 360 px screen. */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <QtyStepper label="Cantidad" value={qty} max={MAX_QTY} onChange={setQty} className="self-start sm:self-auto" />
            <Button type="button" size="lg" className="w-full sm:w-auto sm:flex-1" disabled={!variant} onClick={handleAdd}>
              Agregar al pedido
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {variant && variant.retailPrice !== null
              ? "El precio no incluye el envío: lo coordinamos por WhatsApp."
              : "Los productos sin precio online se cotizan por WhatsApp."}
          </p>
        </div>
      </div>
    </div>
  );
}
