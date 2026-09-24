"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MinusIcon, PlusIcon } from "lucide-react";
import { AvailabilityBadge } from "@/components/site/availability-badge";
import { ProductGallery } from "@/components/site/product-gallery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProductDetail } from "@/lib/api";
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
      },
      qty,
    );
    toast.success(`${product.name} agregado al pedido`, {
      description: `${qty} u. · ${describeSelection(attributes, selection)}`,
      action: { label: "Ver pedido", onClick: () => (window.location.href = "/pedido") },
    });
  }

  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-12">
      <ProductGallery media={product.media} name={product.name} selectedValueIds={selectedValueIds} />

      <div>
        <p className="text-sm text-muted-foreground">
          <Link href={`/catalogo/${product.category.slug}`} className="hover:text-foreground">{product.category.name}</Link>
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{product.name}</h1>
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
                        "inline-flex h-10 min-w-12 items-center justify-center gap-2 rounded-md border px-3 text-sm tabular-nums transition-colors",
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

        <div className="mt-8 rounded-xl border bg-brand-soft/50 p-4">
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

          <div className="mt-4 flex gap-3">
            <div className="flex items-center rounded-md border bg-background">
              <Button type="button" variant="ghost" size="icon" aria-label="Restar uno" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                <MinusIcon />
              </Button>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_QTY}
                aria-label="Cantidad"
                value={qty}
                onChange={(e) => setQty(Math.min(MAX_QTY, Math.max(1, Number(e.target.value) || 1)))}
                className="h-9 w-20 border-0 text-center tabular-nums shadow-none focus-visible:ring-0"
              />
              <Button type="button" variant="ghost" size="icon" aria-label="Sumar uno" onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}>
                <PlusIcon />
              </Button>
            </div>
            <Button type="button" size="lg" className="flex-1" disabled={!variant} onClick={handleAdd}>
              Agregar al pedido
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Sin precios online: te enviamos la cotización por WhatsApp.</p>
        </div>
      </div>
    </div>
  );
}
