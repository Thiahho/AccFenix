import { Journey } from "@/components/home/journey";
import { Reveal } from "@/components/motion/reveal";
import { journeyGoal, steps } from "@/lib/home-content";

/** The three real steps of an order as a route on the espresso band, ending at the cup. */
export function HowWeWork() {
  return (
    <section id="como-trabajamos" className="anchor-section overflow-hidden bg-brand text-brand-foreground" aria-labelledby="como-trabajamos-titulo">
      <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <Reveal>
          <p className="eyebrow text-brand-foreground/85">Cómo trabajamos</p>
          <h2 id="como-trabajamos-titulo" className="title-display mt-3 max-w-2xl text-4xl sm:text-5xl">
            Del pedido a tu puerta, en tres pasos
          </h2>
        </Reveal>
        <div className="mt-12 md:mt-16">
          <Journey steps={steps} goal={journeyGoal} />
        </div>
      </div>
    </section>
  );
}
