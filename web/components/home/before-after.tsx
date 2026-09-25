"use client";

import { useState } from "react";
import { ChevronsLeftRightIcon } from "lucide-react";
import { PhotoSlot } from "@/components/home/photo-slot";

/** Comparador antes/después. Sin las dos fotos muestra los dos espacios lado a lado. */
export function BeforeAfter({ title, before, after }: { title: string; before: string | null; after: string | null }) {
  const [pos, setPos] = useState(50);

  if (!before || !after) {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        <PhotoSlot src={before} alt={`${title}: antes`} hint="Foto: antes" className="aspect-[3/4] rounded-l-xl" sizes="(min-width: 1024px) 16vw, 45vw" />
        <PhotoSlot src={after} alt={`${title}: después`} hint="Foto: después" className="aspect-[3/4] rounded-r-xl" sizes="(min-width: 1024px) 16vw, 45vw" />
      </div>
    );
  }

  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-brand-soft select-none">
      <PhotoSlot src={after} alt={`${title}: después`} hint="" className="absolute inset-0" sizes="(min-width: 1024px) 33vw, 100vw" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <PhotoSlot src={before} alt={`${title}: antes`} hint="" className="absolute inset-0" sizes="(min-width: 1024px) 33vw, 100vw" />
      </div>
      <span className="absolute top-3 left-3 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white">Antes</span>
      <span className="absolute top-3 right-3 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white">Después</span>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_6px_rgba(0,0,0,0.4)]" style={{ left: `${pos}%` }}>
        <span className="absolute top-1/2 left-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-xs font-semibold text-brand shadow-md"><ChevronsLeftRightIcon aria-hidden className="size-5" /></span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label={`Comparar antes y después: ${title}`}
        className="absolute inset-0 size-full cursor-ew-resize touch-pan-y opacity-0"
      />
    </div>
  );
}
