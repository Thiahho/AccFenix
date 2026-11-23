import Link from "next/link";
import { ArrowDownIcon } from "lucide-react";
import { IcedCup } from "@/components/home/iced-cup";
import { Starburst } from "@/components/site/starburst";
import { heroCupLabel, posterPhrases } from "@/lib/home-content";

/** Repeats enough to run past the right edge of a wide screen; the band clips the rest. */
const STRIP_REPEATS = 6;

/** Poster cover: giant stacked words on espresso, the cup on a burst, a stamp and one action. Static server markup. */
export function Hero() {
  return (
    <>
      <section id="inicio" aria-labelledby="hero-titulo" className="poster-ink relative overflow-hidden">
        <div className="relative mx-auto max-w-7xl px-4 pt-5 pb-7 sm:px-6 lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-x-10 lg:px-8 lg:pt-10 lg:pb-12">
          <h1 id="hero-titulo" className="poster-display poster-hero-title relative z-10">
            <span className="block">Café</span>
            <span className="poster-hero-accented block">Frío.</span>
            <span className="block text-latte">Moreno.</span>
          </h1>

          <div className="absolute top-1 -right-5 w-[52vw] max-w-88 sm:right-2 lg:relative lg:top-auto lg:right-auto lg:row-span-2 lg:w-full lg:max-w-136 lg:self-center lg:justify-self-center">
            <Starburst spikes={18} fill="var(--cream)" className="w-full" />
            <IcedCup label={heroCupLabel} className="absolute top-1/2 left-1/2 w-[38%] -translate-x-1/2 -translate-y-1/2" />
            <Starburst
              lines={["Iced", "coffee", "to go"]}
              spikes={14}
              fill="var(--caramel-deep)"
              ink="var(--ivory)"
              className="absolute right-[12%] -bottom-[3%] w-[42%] -rotate-12 lg:right-0 lg:bottom-[2%] lg:w-[34%]"
            />
          </div>

          <div className="relative z-10 mt-5 flex flex-col gap-4 lg:mt-8 lg:max-w-xl">
            <p className="max-w-md text-base leading-snug text-pretty text-cream lg:text-lg">
              Cafés fríos con leche, sabores y tamaños a elegir. Pedí desde la web, pagá con Mercado Pago y retirá o recibí en Moreno.
            </p>
            <Link href="#precios" className="poster-cta w-full bg-cream text-espresso hover:bg-latte sm:w-fit">
              Ver precios <ArrowDownIcon aria-hidden className="size-5" />
            </Link>
          </div>
        </div>
      </section>

      <div aria-hidden className="overflow-hidden border-b-[3px] border-espresso bg-latte py-2 text-espresso">
        <p className="poster-display text-xl whitespace-pre sm:text-2xl">
          {Array.from({ length: STRIP_REPEATS }, () => posterPhrases.join("  /  ")).join("  /  ")}
        </p>
      </div>
    </>
  );
}
