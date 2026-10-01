"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { BarralCard } from "@/components/home/barral-card";
import { Button } from "@/components/ui/button";
import type { ProductAttribute, ProductDetail } from "@/lib/api";
import { cn } from "@/lib/utils";
import { isValueEnabled } from "@/lib/variants";

type Props = {
  product: ProductDetail;
  medidaAttr: ProductAttribute;
  grosorAttr: ProductAttribute;
  colorAttr: ProductAttribute;
  phone: string;
};

// Ayuda corta por grosor (ver la FAQ en lib/home-content.ts). Un grosor nuevo cargado desde el panel se muestra sin ayuda.
const grosorHints: Record<string, string> = {
  "22": "Fino y liviano",
  "34": "Robusto, para tramos largos",
};

const chip =
  "inline-flex h-11 min-w-12 items-center justify-center rounded-md border bg-background px-3 text-sm tabular-nums transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";
const chipOn = "border-brand bg-brand text-brand-foreground";
const chipOff = "hover:border-brand/60 hover:bg-brand-soft";

/** Un grosor a la vez: el visitante elige grosor, medida y color, y la grilla muestra solo eso. */
export function CatalogBrowser({ product, medidaAttr, grosorAttr, colorAttr, phone }: Props) {
  const { variants } = product;
  const [grosorId, setGrosorId] = useState(grosorAttr.values[0]?.id);
  const [medidaId, setMedidaId] = useState<number | null>(null);
  const [colorId, setColorId] = useState(colorAttr.values[0]?.id);
  const [expanded, setExpanded] = useState(false);

  const grosor = grosorAttr.values.find((g) => g.id === grosorId);
  const hasMedida = (gId: number | undefined, mId: number) => isValueEnabled(variants, { [grosorAttr.id]: gId }, medidaAttr.id, mId);
  const medidas = medidaAttr.values.filter((m) => hasMedida(grosorId, m.id));
  const shown = medidaId === null ? medidas : medidas.filter((m) => m.id === medidaId);
  const collapsed = medidaId === null && !expanded;

  function chooseGrosor(id: number) {
    setGrosorId(id);
    if (medidaId !== null && !hasMedida(id, medidaId)) setMedidaId(null);
  }

  if (!grosor) return null;

  return (
    <div className="mt-10">
      <div className="space-y-5 rounded-xl border bg-card p-4 sm:p-5">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Grosor</legend>
          <div className="grid grid-cols-2 gap-2 sm:max-w-md">
            {grosorAttr.values.map((g) => (
              <button
                key={g.id}
                type="button"
                aria-pressed={grosorId === g.id}
                onClick={() => chooseGrosor(g.id)}
                className={cn(chip, "h-auto min-h-14 flex-col gap-0 py-2", grosorId === g.id ? chipOn : chipOff)}
              >
                <span className="font-display text-xl font-semibold tracking-tight">{g.label}</span>
                {grosorHints[g.label] && (
                  <span className={cn("text-xs text-balance", grosorId === g.id ? "text-brand-foreground/80" : "text-muted-foreground")}>
                    {grosorHints[g.label]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Medida (m)</legend>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={medidaId === null} onClick={() => setMedidaId(null)} className={cn(chip, medidaId === null ? chipOn : chipOff)}>
              Todas
            </button>
            {medidaAttr.values.map((m) => {
              const enabled = hasMedida(grosorId, m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={medidaId === m.id}
                  disabled={!enabled}
                  onClick={() => setMedidaId(m.id)}
                  className={cn(
                    chip,
                    medidaId === m.id ? chipOn : chipOff,
                    !enabled && "cursor-not-allowed opacity-40 line-through hover:border-border hover:bg-background",
                  )}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">
            Color
            <span className="ml-2 font-normal text-muted-foreground">{colorAttr.values.find((c) => c.id === colorId)?.label}</span>
          </legend>
          <div className="-ml-1.5 flex flex-wrap">
            {colorAttr.values.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={colorId === c.id}
                aria-label={c.label}
                title={c.label}
                onClick={() => setColorId(c.id)}
                className={cn(
                  "grid size-11 place-items-center rounded-full border-2 border-transparent p-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  colorId === c.id ? "border-brand" : "hover:border-brand/40",
                )}
              >
                <span className="block size-full rounded-full border border-black/10" style={{ backgroundColor: c.colorHex ?? "#ccc" }} />
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <h3 aria-live="polite" className="title-serif mt-8 text-3xl">
        Grosor {grosor.label}
        <span className="ml-2 font-sans text-base font-normal tracking-normal text-muted-foreground tabular-nums">
          {medidaId === null ? `${medidas.length} medidas` : `${shown[0]?.label ?? ""} m`}
        </span>
      </h3>

      <ul key={`${grosorId}-${medidaId}`} className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {shown.map((medida, i) => (
          <li
            key={medida.id}
            style={{ animationDelay: `${i * 40}ms` }}
            className={cn(
              "animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300 motion-reduce:animate-none",
              // Plegado: 4 medidas en celular, 6 en tablet, todas en desktop.
              collapsed && i >= 6 && "hidden lg:block",
              collapsed && i >= 4 && i < 6 && "hidden sm:block",
            )}
          >
            <BarralCard
              key={colorId}
              productSlug={product.slug}
              productName={product.name}
              categoryName={product.category.name}
              medidaAttr={medidaAttr}
              grosorAttr={grosorAttr}
              colorAttr={colorAttr}
              medida={medida}
              grosor={grosor}
              initialColorId={colorId}
              variants={variants}
              media={product.media}
              phone={phone}
            />
          </li>
        ))}
      </ul>

      {collapsed && shown.length > 4 && (
        <div className={cn("mt-5 flex justify-center lg:hidden", shown.length <= 6 && "sm:hidden")}>
          <Button type="button" variant="outline" className="h-11" onClick={() => setExpanded(true)}>
            Ver las {shown.length} medidas <ChevronDownIcon aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}
