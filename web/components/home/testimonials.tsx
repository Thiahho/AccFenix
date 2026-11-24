"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import * as m from "motion/react-m";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { testimonialSourceLabel, type Testimonial } from "@/lib/api";

const altText = (t: Testimonial) => t.caption ?? `Captura de un mensaje de un cliente por ${testimonialSourceLabel[t.source]}`;

function SourceLabel({ testimonial }: { testimonial: Testimonial }) {
  return <span className="poster-label text-caramel-deep">{testimonialSourceLabel[testimonial.source]}</span>;
}

const arrowClass =
  "poster-focus-inset grid size-11 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-caramel-deep hover:text-caramel-deep disabled:pointer-events-none disabled:opacity-35";

/**
 * Screenshots of customer messages (Instagram, WhatsApp...). They are not verified purchases, so they never carry that
 * label. A sideways carousel at every size, with previous/next arrows and a staggered entrance; each screenshot opens
 * full size in a dialog.
 */
export function Testimonials({ items }: { items: Testimonial[] }) {
  const listId = useId();
  const track = useRef<HTMLUListElement>(null);
  const reduceMotion = usePrefersReducedMotion();
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  // Arrows enable only when there is somewhere to go (1px of slack for subpixel scroll positions).
  const updateArrows = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 1);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const resize = new ResizeObserver(updateArrows);
    resize.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      resize.disconnect();
    };
  }, [updateArrows, items.length]);

  // Moves by most of the visible width, so the last card of the current view stays as context.
  const move = (direction: -1 | 1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: reduceMotion ? "auto" : "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <section id="clientes" className="anchor-section border-t border-border bg-ivory" aria-labelledby="clientes-titulo">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        <div className="flex flex-col items-center gap-6 pb-8 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left lg:pb-10">
          <div>
            <p className="poster-hand text-2xl text-caramel-deep">Clientes</p>
            <h2 id="clientes-titulo" className="poster-display poster-section-title mt-2 text-balance">
              Lo que dicen nuestros clientes
            </h2>
          </div>
          {(canPrev || canNext) && (
            <div className="flex shrink-0 gap-2">
              <button type="button" className={arrowClass} onClick={() => move(-1)} disabled={!canPrev} aria-controls={listId} aria-label="Ver mensajes anteriores">
                <ChevronLeftIcon aria-hidden className="size-5" />
              </button>
              <button type="button" className={arrowClass} onClick={() => move(1)} disabled={!canNext} aria-controls={listId} aria-label="Ver más mensajes">
                <ChevronRightIcon aria-hidden className="size-5" />
              </button>
            </div>
          )}
        </div>

        {/* `relative`: the row is the containing block of its cards, so nothing inside can widen the page on phones. */}
        <ul
          ref={track}
          id={listId}
          className="relative -mx-4 flex snap-x snap-mandatory scroll-px-4 items-start gap-4 overflow-x-auto overscroll-x-contain px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {items.map((t, index) => (
            <m.li
              key={t.id}
              className="w-64 shrink-0 snap-start sm:w-72 lg:w-[calc((100%-3rem)/4)]"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, ease: "easeOut", delay: Math.min(index, 4) * 0.08 }}
            >
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
                      sizes="(min-width: 1024px) 20rem, (min-width: 640px) 18rem, 16rem"
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
            </m.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
