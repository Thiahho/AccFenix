import Image from "next/image";
import Link from "next/link";
import { ArrowDownIcon, MessageCircleIcon, TruckIcon } from "lucide-react";
import { HeroEgg } from "@/components/home/hero-egg";
import { Wordmark } from "@/components/site/wordmark";
import { heroImage } from "@/lib/home-content";
import { whatsappUrl } from "@/lib/whatsapp";

/** "Somos Eggy" cover: warm gradient after the reference story, egg photo and the two main actions. */
export function Hero({ phone }: { phone: string }) {
  return (
    <section
      id="inicio"
      aria-labelledby="hero-titulo"
      className="relative overflow-hidden bg-[radial-gradient(120%_90%_at_70%_20%,oklch(0.55_0.15_42)_0%,oklch(0.36_0.1_35)_55%,oklch(0.24_0.05_35)_100%)] text-cream"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-28 pb-14 md:grid-cols-[1.15fr_1fr] md:gap-12 md:pt-36 md:pb-20">
        {/* Above the fold: the headline is static markup (it is the LCP candidate); the items around it enter with a CSS
            keyframe (.hero-in in globals.css), so they play on first paint and end fully visible even without JS. */}
        <div className="flex flex-col gap-6">
          <p className="hero-in eyebrow text-yolk-light [--hero-i:0] [--hero-y:10px]">Venta minorista y mayorista</p>
          <h1 id="hero-titulo" className="flex flex-col gap-1">
            <span className="title-display text-5xl sm:text-6xl lg:text-7xl">Somos</span>
            <span className="-mt-1 flex">
              <Wordmark tone="light" className="text-7xl drop-shadow-[0_4px_16px_rgb(0_0_0/0.35)] sm:text-8xl lg:text-9xl" />
            </span>
            <span className="mt-3 text-sm font-bold tracking-[0.35em] text-cream/90 uppercase sm:text-base">
              Distribuidora de huevos
            </span>
          </h1>
          <p className="hero-in max-w-md text-lg text-pretty text-cream/85 [--hero-i:1]">
            Huevos frescos por maple, medio cajón y cajón. Pedís por WhatsApp o desde la web y te lo llevamos con nuestro camión.
          </p>
          <div className="hero-in flex flex-col gap-3 [--hero-i:2] sm:flex-row sm:items-center">
            <Link
              href="#precios"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-7 text-[15px] font-bold tracking-wide text-brand-foreground uppercase shadow-[0_10px_30px_rgb(0_0_0/0.3)] transition-[background-color,translate] hover:-translate-y-0.5 hover:bg-brand/90 focus-visible:ring-3 focus-visible:ring-yolk-light focus-visible:outline-none motion-reduce:hover:translate-y-0"
            >
              Ver precios <ArrowDownIcon aria-hidden className="size-4" />
            </Link>
            {phone && (
              <a
                href={whatsappUrl(phone, "¡Hola! Quiero hacer un pedido de huevos.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 border-cream/70 px-6 text-[15px] font-semibold transition-colors hover:border-cream hover:bg-cream hover:text-charcoal focus-visible:ring-3 focus-visible:ring-yolk-light focus-visible:outline-none"
              >
                <MessageCircleIcon aria-hidden className="size-4" /> Pedir por WhatsApp
              </a>
            )}
          </div>
          <p className="hero-in flex items-center gap-2 text-sm text-cream/75 [--hero-i:3] [--hero-y:8px]">
            <TruckIcon aria-hidden className="size-5 text-yolk-light" /> Entrega con camión propio
          </p>
        </div>

        <HeroEgg>
          <div className="relative aspect-[293/379] overflow-hidden rounded-[2rem] shadow-[0_30px_70px_rgb(0_0_0/0.45)] ring-1 ring-cream/15">
            <Image src={heroImage.src} alt={heroImage.alt} fill priority sizes="(min-width: 640px) 320px, 80vw" className="object-cover" />
          </div>
        </HeroEgg>
      </div>
    </section>
  );
}
