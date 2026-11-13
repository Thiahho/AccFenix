import { ClipboardCheckIcon, MessageCircleIcon, TruckIcon } from "lucide-react";
import { GrowX, Pop, Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { ScrollLine } from "@/components/motion/scroll-line";
import { steps } from "@/lib/home-content";

const icons = [MessageCircleIcon, ClipboardCheckIcon, TruckIcon];

/** The three real steps of an order, on the warm red band. */
export function HowWeWork() {
  return (
    <section id="como-trabajamos" className="anchor-section bg-brand text-brand-foreground" aria-labelledby="como-trabajamos-titulo">
      <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <Reveal>
          <p className="eyebrow text-brand-foreground/85">Cómo trabajamos</p>
          <h2 id="como-trabajamos-titulo" className="title-display mt-3 max-w-2xl text-4xl sm:text-5xl">
            Del pedido a tu puerta, en tres pasos
          </h2>
        </Reveal>
        <div className="relative mt-10">
          <Stagger as="ol" stagger={0.15} className="grid gap-6 sm:grid-cols-3">
            {steps.map((step, i) => {
              const Icon = icons[i] ?? TruckIcon;
              return (
                <StaggerItem as="li" key={step.title} className="relative flex flex-col gap-3 border-t-2 border-brand-foreground/30 pt-5">
                  {/* Mobile: each step draws its own top line as it appears. */}
                  <GrowX aria-hidden className="absolute inset-x-0 -top-0.5 h-0.5 bg-brand-foreground sm:hidden" />
                  <div className="flex items-center gap-3">
                    <span aria-hidden className="font-heading text-4xl leading-none font-black text-brand-foreground/50 tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <Pop from={0.4} delay={0.15} className="inline-flex">
                      <Icon aria-hidden className="size-6" />
                    </Pop>
                  </div>
                  <strong className="title-display text-2xl">{step.title}</strong>
                  <span className="leading-relaxed text-brand-foreground/90 text-pretty">{step.text}</span>
                </StaggerItem>
              );
            })}
          </Stagger>
          {/* Desktop: one connector that draws itself across the three steps as the section scrolls by. */}
          <ScrollLine className="absolute inset-x-0 top-0 hidden h-0.5 bg-brand-foreground sm:block" />
        </div>
      </div>
    </section>
  );
}
