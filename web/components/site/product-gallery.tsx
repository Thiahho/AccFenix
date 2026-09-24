"use client";

import { useState } from "react";
import Image from "next/image";
import { ProductImage } from "@/components/site/product-image";
import type { Media } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Galería de fotos y videos. Si hay media asociada a un valor elegido (p. ej. el color), la prioriza. */
export function ProductGallery({ media, name, selectedValueIds }: { media: Media[]; name: string; selectedValueIds: number[] }) {
  const matching = media.filter((m) => m.attributeValueId !== null && selectedValueIds.includes(m.attributeValueId));
  const generic = media.filter((m) => m.attributeValueId === null);
  const items = matching.length > 0 ? [...matching, ...generic] : media;
  const [activeId, setActiveId] = useState<number | null>(null);
  const active = items.find((m) => m.id === activeId) ?? items[0];

  if (!active) return <ProductImage src={null} alt={name} />;

  return (
    <div>
      {active.type === "video" ? (
        <video src={active.url} controls playsInline className="aspect-square w-full rounded-lg bg-black object-contain" />
      ) : (
        <ProductImage src={active.url} alt={name} priority sizes="(min-width: 768px) 50vw, 100vw" />
      )}
      {items.length > 1 && (
        <ul className="mt-3 grid grid-cols-5 gap-2">
          {items.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setActiveId(m.id)}
                aria-label={`Ver ${m.type === "video" ? "video" : "foto"} ${i + 1}`}
                aria-current={m.id === active.id}
                className={cn(
                  "relative block aspect-square w-full overflow-hidden rounded-md border-2 bg-brand-soft",
                  m.id === active.id ? "border-brand" : "border-transparent hover:border-brand/40",
                )}
              >
                {m.type === "video" ? (
                  <span className="grid h-full place-items-center text-xs font-medium text-brand">Video</span>
                ) : (
                  <Image src={m.url} alt="" fill sizes="96px" className="object-cover" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
