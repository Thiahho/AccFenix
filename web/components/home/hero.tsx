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
            <span className="block text-latte">Frío.</span>
            <span className="block">Moreno.</span>
          </h1>

          <div className="absolute top-4 -right-2 aspect-square w-[42vw] max-w-72 sm:right-6 lg:relative lg:top-auto lg:right-auto lg:row-span-2 lg:w-full lg:max-w-120 lg:self-center lg:justify-self-center">
            <div aria-hidden className="absolute inset-0 rounded-full bg-[radial-gradient(circle,color-mix(in_oklch,var(--poster-gold)_34%,transparent),transparent_68%)]" />
            <IcedCup label={heroCupLabel} className="absolute top-1/2 left-1/2 w-[48%] -translate-x-1/2 -translate-y-1/2 rotate-6 drop-shadow-[0_24px_32px_rgb(0_0_0/0.55)]" />
            <Starburst
              lines={["Iced", "coffee", "to go"]}
              spikes={14}
              fill="var(--poster-gold)"
              ink="var(--poster-on-gold)"
              className="absolute right-[2%] bottom-[4%] w-[34%] -rotate-12"
            />
          </div>

          <div className="relative z-10 mt-5 flex flex-col gap-4 lg:mt-8 lg:max-w-xl">
            <p className="max-w-md text-base leading-snug text-pretty text-cream lg:text-lg">
              Cafés fríos con leche, sabores y tamaños a elegir. Pedí desde la web, pagá con Mercado Pago y retirá o recibí en Moreno.
            </p>
            <Link href="#precios" className="poster-cta w-full sm:w-fit">
              Ver precios <ArrowDownIcon aria-hidden className="size-5" />
            </Link>
          </div>
        </div>
      </section>

      <div aria-hidden className="overflow-hidden border-y border-border bg-card py-2.5 text-caramel-deep">
        <p className="poster-hand text-xl leading-none whitespace-pre">
          {Array.from({ length: STRIP_REPEATS }, () => posterPhrases.join("  /  ")).join("  /  ")}
        </p>
      </div>
    </>
  );
}
