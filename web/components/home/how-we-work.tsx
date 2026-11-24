import { IcedCup } from "@/components/home/iced-cup";
import { journeyGoal, steps } from "@/lib/home-content";

/** The three real steps of an order as numbered cards, closed by a deeper card with the cup. */
export function HowWeWork() {
  return (
    <section id="como-trabajamos" className="anchor-section border-y border-border bg-card/40" aria-labelledby="como-trabajamos-titulo">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        <div className="pb-8 text-center lg:pb-10">
          <p className="poster-hand text-2xl text-caramel-deep">Cómo trabajamos</p>
          <h2 id="como-trabajamos-titulo" className="poster-display poster-section-title mt-2 text-balance">
            Del pedido a tu puerta, en tres pasos
          </h2>
        </div>

        <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-4 rounded-2xl border border-border bg-card p-5 md:flex-col lg:p-6">
              <span aria-hidden className="poster-display grid size-12 shrink-0 place-items-center rounded-full border border-caramel-deep/50 text-xl text-caramel-deep">
                {i + 1}
              </span>
              <span className="flex flex-col gap-2">
                <strong className="poster-display text-xl lg:text-2xl">{step.title}</strong>
                <span className="leading-snug text-pretty text-muted-foreground">{step.text}</span>
              </span>
            </li>
          ))}
          <li className="poster-ink flex items-center gap-4 rounded-2xl border border-caramel-deep/40 p-5 md:flex-col md:items-start lg:p-6">
            <span aria-hidden className="grid h-16 w-12 shrink-0 place-items-center">
              <IcedCup className="h-full w-auto" />
            </span>
            <span className="flex flex-col gap-2">
              <strong className="poster-display text-xl text-latte lg:text-2xl">{journeyGoal.title}</strong>
              <span className="leading-snug text-pretty text-cream">{journeyGoal.text}</span>
            </span>
          </li>
        </ol>
      </div>
    </section>
  );
}
