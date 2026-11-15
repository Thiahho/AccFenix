import { MessageCircleIcon, StoreIcon } from "lucide-react";
import { CountUp } from "@/components/motion/count-up";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { wholesaleConditions } from "@/lib/home-content";
import { buildWholesaleMessage, whatsappUrl } from "@/lib/whatsapp";

/** Wholesale pitch for shops, groceries and restaurants, using the threshold set in the admin panel. */
export function Wholesale({ phone, threshold }: { phone: string; threshold: number }) {
  return (
    <section id="mayoristas" className="anchor-section bg-egg-tray text-cream" aria-labelledby="mayoristas-titulo">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 md:items-center md:gap-16 md:py-20">
        <Reveal>
          <p className="eyebrow flex items-center gap-2 text-yolk-light">
            <StoreIcon aria-hidden className="size-4" /> Mayoristas
          </p>
          <h2 id="mayoristas-titulo" className="title-display mt-3 text-4xl sm:text-5xl">
            ¿Tenés un comercio, almacén o restaurante?
          </h2>
          <p className="mt-4 max-w-md text-lg text-cream/85 text-pretty">
            Te abastecemos con reparto propio.
            {threshold > 0 && (
              <>
                {" "}
                Los pedidos desde <CountUp value={threshold} className="font-bold text-yolk-light tabular-nums" /> unidades con precio se cobran a precio mayorista.
              </>
            )} Contanos qué necesitás y armamos tu entrega.
          </p>
          {phone && (
            <a
              href={whatsappUrl(phone, buildWholesaleMessage(threshold))}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand px-7 text-[15px] font-bold tracking-wide text-brand-foreground uppercase transition-colors hover:bg-brand/90 focus-visible:ring-3 focus-visible:ring-yolk-light focus-visible:outline-none sm:w-auto"
            >
              <MessageCircleIcon aria-hidden className="size-4" /> Comprar por mayor
            </a>
          )}
        </Reveal>
        <Stagger as="ul" stagger={0.1}>
          {wholesaleConditions.map((c, i) => (
            <StaggerItem as="li" key={c} y={12} className="flex gap-4 border-t border-cream/25 py-4 last:border-b">
              <span aria-hidden className="font-heading text-3xl leading-none font-black text-yolk-light tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="leading-relaxed text-cream/90 text-pretty">{c}</span>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
