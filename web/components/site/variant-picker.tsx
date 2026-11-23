"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AvailabilityBadge } from "@/components/site/availability-badge";
import { notifyAdded } from "@/components/site/order-toast";
import { ProductGallery } from "@/components/site/product-gallery";
import { Button } from "@/components/ui/button";
import { QtyStepper } from "@/components/site/qty-stepper";
import type { ProductDetail } from "@/lib/api";
import { formatArs } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { describeSelection, findVariant, initialSelection, isValueEnabled, select, type Selection } from "@/lib/variants";
import { MAX_QTY, useCart } from "@/stores/cart";

export function VariantPicker({ product }: { product: ProductDetail }) {
  const { attributes, variants } = product;
  const [selection, setSelection] = useState<Selection>(() => initialSelection(attributes));
  const [qty, setQty] = useState(1);
  const add = useCart((s) => s.add);

  const variant = useMemo(() => findVariant(attributes, variants, selection), [attributes, variants, selection]);
  const missing = attributes.filter((a) => selection[a.id] === undefined).map((a) => a.name.toLowerCase());
  const selectedValueIds = Object.values(selection).filter((v): v is number => v !== undefined);

  function handleAdd() {
    if (!variant) return;
    add(
      {
        variantId: variant.id,
        productSlug: product.slug,
        productName: product.name,
        categoryName: product.category.name,
        valuesLabel: describeSelection(attributes, selection),
        availability: variant.availability,
        retailPrice: variant.retailPrice,
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
      detail: `${qty} u. · ${describeSelection(attributes, selection)}`,
      availability: variant.availability,
      imageUrl: image?.url,
      colorHex,
    });
  }

  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-12">
      <ProductGallery media={product.media} name={product.name} selectedValueIds={selectedValueIds} />

      <div>
        <p className="eyebrow text-caramel-deep">
          <Link href={`/catalogo/${product.category.slug}`} className="hover:text-foreground">{product.category.name}</Link>
        </p>
        <h1 className="title-display mt-3 text-4xl sm:text-5xl">{product.name}</h1>
        {product.description && <p className="mt-3 text-muted-foreground">{product.description}</p>}

        <div className="mt-8 space-y-6">
          {attributes.map((attr) => (
            <fieldset key={attr.id}>
              <legend className="mb-2 text-sm font-medium">
                {attr.name}
                {selection[attr.id] !== undefined && (
                  <span className="ml-2 font-normal text-muted-foreground">
                    {attr.values.find((v) => v.id === selection[attr.id])?.label}
                  </span>
                )}
              </legend>
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
                        "inline-flex h-11 min-w-12 items-center justify-center gap-2 rounded-md border px-3 text-sm tabular-nums transition-colors",
                        "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                        selected ? "border-brand bg-brand text-brand-foreground" : "hover:border-brand/60 hover:bg-brand-soft",
                        !enabled && "cursor-not-allowed opacity-40 line-through hover:border-border hover:bg-transparent",
                      )}
                    >
                      {value.colorHex && (
                        <span aria-hidden className="size-4 rounded-full border border-black/10" style={{ backgroundColor: value.colorHex }} />
                      )}
                      {value.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-caramel/70 bg-card p-4">
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
            <div className="mt-3 border-t pt-3">
              <p className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-muted-foreground">Precio por unidad</span>
                <span className="text-2xl font-semibold tabular-nums">
                  {variant.retailPrice !== null ? formatArs(variant.retailPrice) : "Consultar"}
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
