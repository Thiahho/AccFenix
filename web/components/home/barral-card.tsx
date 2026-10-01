"use client";

import { useMemo, useState } from "react";
import { CheckIcon, MessageCircleIcon, PlusIcon } from "lucide-react";
import { AvailabilityBadge } from "@/components/site/availability-badge";
import { notifyAdded } from "@/components/site/order-toast";
import { PhotoSlot } from "@/components/home/photo-slot";
import { Button } from "@/components/ui/button";
import type { AttributeValue, Media, ProductAttribute, Variant } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/lib/use-hydrated";
import { describeSelection, findVariant, isValueEnabled, type Selection } from "@/lib/variants";
import { buildVariantMessage, whatsappUrl } from "@/lib/whatsapp";
import { useCart } from "@/stores/cart";

type Props = {
  productSlug: string;
  productName: string;
  categoryName: string;
  medidaAttr: ProductAttribute;
  grosorAttr: ProductAttribute;
  colorAttr: ProductAttribute;
  medida: AttributeValue;
  grosor: AttributeValue;
  /** Color con el que arranca la tarjeta; si no existe para esta medida y grosor, se usa el primero disponible. */
  initialColorId?: number;
  variants: Variant[];
  media: Media[];
  phone: string;
};

/** Una medida en un grosor: el visitante elige color y ve el barral y el barral instalado. */
export function BarralCard({ productSlug, productName, categoryName, medidaAttr, grosorAttr, colorAttr, medida, grosor, initialColorId, variants, media, phone }: Props) {
  const attributes = useMemo(() => [medidaAttr, grosorAttr, colorAttr], [medidaAttr, grosorAttr, colorAttr]);
  const base: Selection = { [medidaAttr.id]: medida.id, [grosorAttr.id]: grosor.id };
  const enabledColors = colorAttr.values.filter((c) => isValueEnabled(variants, base, colorAttr.id, c.id));
  const firstColor = enabledColors.find((c) => c.id === initialColorId) ?? enabledColors[0];
  const [colorId, setColorId] = useState<number | undefined>(firstColor?.id);
  const [view, setView] = useState<"barral" | "instalado">("barral");
  const add = useCart((s) => s.add);

  const selection: Selection = { ...base, [colorAttr.id]: colorId };
  const variant = findVariant(attributes, variants, selection);
  const label = describeSelection(attributes, selection);
  const color = colorAttr.values.find((c) => c.id === colorId);
  const hydrated = useHydrated();
  const cartQty = useCart((s) => s.items.find((i) => i.variantId === variant?.id)?.qty ?? 0);
  const inCart = hydrated ? cartQty : 0;

  // Convención de carga: la primera foto del valor es el barral solo; la segunda, el barral instalado.
  const ids = [medida.id, grosor.id, colorId];
  const photos = [
    ...media.filter((m) => m.type === "image" && m.attributeValueId !== null && ids.includes(m.attributeValueId)),
    ...media.filter((m) => m.type === "image" && m.attributeValueId === null),
  ];
  const photo = view === "barral" ? photos[0] : (photos[1] ?? photos[0]);

  function handleAdd() {
    if (!variant) return;
    add(
      { variantId: variant.id, productSlug, productName, categoryName, valuesLabel: label, availability: variant.availability },
      1,
    );
    notifyAdded({
      title: `${productName} ${medida.label} m`,
      detail: `Grosor ${grosor.label} · ${color?.label ?? ""}`,
      availability: variant.availability,
      imageUrl: photos[0]?.url,
      colorHex: color?.colorHex,
    });
  }

  return (
    <article className={cn("flex h-full flex-row overflow-hidden rounded-xl border bg-card transition-shadow sm:flex-col", inCart > 0 && "border-brand ring-3 ring-brand/15")}>
      <div className="relative min-h-60 w-[38%] shrink-0 sm:min-h-0 sm:w-auto">
        <PhotoSlot
          src={photo?.url}
          alt={`${productName} ${medida.label} m, grosor ${grosor.label}${view === "instalado" ? ", instalado" : ""}`}
          hint={view === "barral" ? "Foto del barral" : "Foto del barral instalado"}
          className="absolute inset-0 sm:relative sm:inset-auto sm:aspect-[4/3]"
          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 40vw"
        />
        <div role="group" aria-label="Ver foto" className="absolute right-2 bottom-2 left-2 flex flex-col gap-0.5 rounded-lg sm:flex-row sm:gap-0 bg-background/90 p-0.5 text-xs backdrop-blur">
          {(["barral", "instalado"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={cn(
                "flex-1 rounded-md py-3 text-xs font-medium sm:py-3.5 md:py-1 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                view === v ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v === "barral" ? "Barral" : "Instalado"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <h4 className="font-display text-2xl font-semibold tracking-tight tabular-nums">{medida.label} m</h4>
          {variant && <AvailabilityBadge availability={variant.availability} />}
        </div>

        <fieldset className="mt-2">
          <legend className="sr-only">Color</legend>
          <div className="-ml-1.5 flex flex-wrap gap-0">
            {colorAttr.values.map((c) => {
              const enabled = isValueEnabled(variants, base, colorAttr.id, c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={colorId === c.id}
                  aria-label={c.label}
                  title={c.label}
                  disabled={!enabled}
                  onClick={() => setColorId(c.id)}
                  className={cn(
                    "grid size-11 place-items-center rounded-full border-2 border-transparent p-2 md:size-8 md:p-1 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-40",
                    colorId === c.id ? "border-brand" : "hover:border-brand/40",
                  )}
                >
                  <span className="block size-full rounded-full border border-black/10" style={{ backgroundColor: c.colorHex ?? "#ccc" }} />
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{colorAttr.values.find((c) => c.id === colorId)?.label ?? "Elegí un color"}</p>
        </fieldset>

        <div className="mt-auto flex flex-col gap-2 pt-4">
          {phone && variant ? (
            <Button asChild className="h-auto min-h-11 whitespace-normal bg-[#128C4A] py-2 text-center leading-tight md:h-9 text-white hover:bg-[#0f7a40]">
              <a href={whatsappUrl(phone, buildVariantMessage(productName, label))} target="_blank" rel="noopener noreferrer">
                <MessageCircleIcon aria-hidden /> Pedir por WhatsApp
              </a>
            </Button>
          ) : (
            <Button disabled className="h-auto min-h-11 whitespace-normal py-2 text-center leading-tight md:h-9">
              <MessageCircleIcon aria-hidden /> Pedir por WhatsApp
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-auto min-h-11 whitespace-normal py-2 text-center leading-tight md:min-h-9",
              inCart > 0 && "border-brand bg-brand-soft font-semibold text-brand hover:bg-brand-soft hover:text-brand",
            )}
            disabled={!variant}
            onClick={handleAdd}
          >
            {inCart > 0 ? (
              <>
                <CheckIcon aria-hidden /> Sumado · {inCart} en el pedido
              </>
            ) : (
              <>
                <PlusIcon aria-hidden /> Sumar al pedido
              </>
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}
