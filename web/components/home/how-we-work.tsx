import { ClipboardCheckIcon, MessageCircleIcon, TruckIcon } from "lucide-react";
import { steps } from "@/lib/home-content";

const icons = [MessageCircleIcon, ClipboardCheckIcon, TruckIcon];

/** The three real steps of an order, on the warm red band. */
export function HowWeWork() {
  return (
    <section id="como-trabajamos" className="anchor-section bg-brand text-brand-foreground" aria-labelledby="como-trabajamos-titulo">
      <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <p className="eyebrow text-brand-foreground/85">Cómo trabajamos</p>
        <h2 id="como-trabajamos-titulo" className="title-display mt-3 max-w-2xl text-4xl sm:text-5xl">
          Del pedido a tu puerta, en tres pasos
        </h2>
        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = icons[i] ?? TruckIcon;
            return (
              <li key={step.title} className="flex flex-col gap-3 border-t-2 border-brand-foreground/40 pt-5">
                <div className="flex items-center gap-3">
                  <span aria-hidden className="font-heading text-4xl leading-none font-black text-brand-foreground/50 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Icon aria-hidden className="size-6" />
                </div>
                <strong className="title-display text-2xl">{step.title}</strong>
                <span className="leading-relaxed text-brand-foreground/90 text-pretty">{step.text}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
