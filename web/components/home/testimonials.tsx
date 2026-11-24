"use client";

import Image from "next/image";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { testimonialSourceLabel, type Testimonial } from "@/lib/api";

const altText = (t: Testimonial) => t.caption ?? `Captura de un mensaje de un cliente por ${testimonialSourceLabel[t.source]}`;

function SourceLabel({ testimonial }: { testimonial: Testimonial }) {
  return <span className="poster-label text-caramel-deep">{testimonialSourceLabel[testimonial.source]}</span>;
}

/**
 * Screenshots of customer messages (Instagram, WhatsApp...). They are not verified purchases, so they never carry that
 * label. A row that scrolls sideways on phones, masonry columns from tablets up; each one opens full size in a dialog.
 */
export function Testimonials({ items }: { items: Testimonial[] }) {
  if (items.length === 0) return null;

  return (
    <section id="clientes" className="anchor-section border-t border-border bg-ivory" aria-labelledby="clientes-titulo">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        <div className="pb-8 text-center lg:pb-10">
          <p className="poster-hand text-2xl text-caramel-deep">Clientes</p>
          <h2 id="clientes-titulo" className="poster-display poster-section-title mt-2 text-balance">
            Lo que dicen nuestros clientes
          </h2>
        </div>

        <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 md:mx-0 md:block md:columns-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0 lg:columns-4">
          {items.map((t) => (
            <li key={t.id} className="w-64 shrink-0 snap-start md:mb-4 md:w-auto md:break-inside-avoid">
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="poster-focus-inset group block w-full overflow-hidden rounded-2xl border border-border bg-card text-left transition-colors hover:border-caramel-deep/50"
                    aria-label={`Ver captura completa: ${altText(t)}`}
                  >
                    <Image
                      src={t.url}
                      alt={altText(t)}
                      width={t.width}
                      height={t.height}
                      sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 16rem"
                      className="h-auto w-full"
                    />
                    <span className="flex flex-col gap-1 p-4">
                      <SourceLabel testimonial={t} />
                      {t.caption && <span className="leading-snug text-pretty text-muted-foreground">{t.caption}</span>}
                    </span>
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogTitle className="sr-only">Mensaje de un cliente por {testimonialSourceLabel[t.source]}</DialogTitle>
                  <DialogDescription className={t.caption ? "pr-8" : "sr-only"}>{t.caption ?? altText(t)}</DialogDescription>
                  <Image
                    src={t.url}
                    alt={altText(t)}
                    width={t.width}
                    height={t.height}
                    sizes="(min-width: 640px) 32rem, 100vw"
                    className="mx-auto h-auto max-h-[75dvh] w-auto rounded-lg"
                  />
                  <SourceLabel testimonial={t} />
                </DialogContent>
              </Dialog>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
