import { IcedCup } from "@/components/home/iced-cup";
import { journeyGoal, steps } from "@/lib/home-content";

/** The three real steps of an order as numbered poster columns, closed by a solid block with the cup. */
export function HowWeWork() {
  return (
    <section id="como-trabajamos" className="anchor-section border-b-[3px] border-espresso bg-oat text-espresso" aria-labelledby="como-trabajamos-titulo">
      <div className="px-4 pt-10 pb-6 sm:px-6 lg:px-8 lg:pt-16 lg:pb-10">
        <p className="poster-label text-muted-foreground">Cómo trabajamos</p>
        <h2 id="como-trabajamos-titulo" className="poster-display poster-section-title mt-2 lg:text-8xl lg:leading-[1.08]">
          Del pedido a tu puerta, en tres pasos
        </h2>
      </div>

      <ol className="grid border-t-[3px] border-espresso md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-4 border-b-[3px] border-espresso px-4 py-6 sm:px-6 md:flex-col md:border-r-[3px] md:even:border-r-0 lg:px-8 xl:border-b-0 xl:even:border-r-[3px]">
            <span aria-hidden className="poster-display w-14 shrink-0 text-7xl leading-none text-caramel-deep md:w-auto md:text-8xl">
              {i + 1}
            </span>
            <span className="flex flex-col gap-2">
              <strong className="poster-display text-3xl font-normal lg:text-4xl">{step.title}</strong>
              <span className="leading-snug text-pretty">{step.text}</span>
            </span>
          </li>
        ))}
        <li className="poster-ink flex items-center gap-4 px-4 py-6 sm:px-6 md:flex-col md:items-start lg:px-8">
          <span aria-hidden className="grid w-14 shrink-0 place-items-center bg-cream p-1.5 md:h-24 md:w-20">
            <IcedCup className="h-full w-auto" />
          </span>
          <span className="flex flex-col gap-2">
            <strong className="poster-display text-3xl font-normal lg:text-4xl">{journeyGoal.title}</strong>
            <span className="leading-snug text-pretty text-cream">{journeyGoal.text}</span>
          </span>
        </li>
      </ol>
    </section>
  );
}
