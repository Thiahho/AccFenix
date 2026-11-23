import Image from "next/image";
import Link from "next/link";
import { ArrowDownIcon, CupSodaIcon, MessageCircleIcon, TruckIcon } from "lucide-react";
import { HeroEgg } from "@/components/home/hero-egg";
import { CoffeeStains, MenuPill, ScriptAccent } from "@/components/site/menu-card";
import { Wordmark } from "@/components/site/wordmark";
import { accentPhrases, heroImage } from "@/lib/home-content";
import { whatsappUrl } from "@/lib/whatsapp";

/** ColdCup cover: menu-paper background with coffee-stain corners, the cup and the two main actions. */
export function Hero({ phone }: { phone: string }) {
  return (
    <section
      id="inicio"
      aria-labelledby="hero-titulo"
      className="relative overflow-hidden bg-background text-foreground"
    >
      <CoffeeStains />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pt-28 pb-14 md:grid-cols-[1.15fr_1fr] md:gap-12 md:pt-36 md:pb-20">
        {/* Above the fold: the headline is static markup (it is the LCP candidate); the items around it enter with a CSS
            keyframe (.hero-in in globals.css), so they play on first paint and end fully visible even without JS. */}
        <div className="flex flex-col gap-6">
          <div className="hero-in [--hero-i:0] [--hero-y:10px]">
            <MenuPill icon={CupSodaIcon}>Cafés fríos</MenuPill>
          </div>
          <h1 id="hero-titulo" className="flex flex-col gap-1">
            <span className="title-display text-5xl sm:text-6xl lg:text-7xl">Somos</span>
            <span className="-mt-1 flex">
              <Wordmark className="text-7xl sm:text-8xl lg:text-9xl" />
            </span>
            <span className="mt-3 text-sm font-bold tracking-[0.3em] text-caramel-deep uppercase sm:text-base">
              Para llevar y a domicilio
            </span>
          </h1>
          <p className="hero-in max-w-md text-lg text-pretty text-muted-foreground [--hero-i:1]">
            Cafés fríos con leche, sabores y tamaños a elegir. Pedí desde la web, pagá con Mercado Pago y retirá o recibí en Moreno.
          </p>
          <div className="hero-in flex flex-col gap-3 [--hero-i:2] sm:flex-row sm:items-center">
            <Link
              href="#precios"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-7 text-[15px] font-bold tracking-wide text-brand-foreground uppercase transition-[background-color,translate] hover:-translate-y-0.5 hover:bg-roast focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:hover:translate-y-0"
            >
              Ver precios <ArrowDownIcon aria-hidden className="size-4" />
            </Link>
            {phone && (
              <a
                href={whatsappUrl(phone, "¡Hola! Quiero hacer un pedido de café frío.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 border-espresso px-6 text-[15px] font-semibold transition-colors hover:bg-espresso hover:text-ivory focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <MessageCircleIcon aria-hidden className="size-4" /> Pedir por WhatsApp
              </a>
            )}
          </div>
          <p className="hero-in flex items-center gap-2 text-sm text-muted-foreground [--hero-i:3] [--hero-y:8px]">
            <TruckIcon aria-hidden className="size-5 text-caramel-deep" /> Envíos en Moreno o retiro en el local
          </p>
          <ScriptAccent className="hero-in -rotate-2 text-3xl [--hero-i:4] sm:text-4xl">{accentPhrases.hero}</ScriptAccent>
        </div>

        <HeroEgg>
          <div className="relative aspect-[293/379] overflow-hidden rounded-[2rem] border border-caramel/70">
            <Image src={heroImage.src} alt={heroImage.alt} fill priority sizes="(min-width: 640px) 320px, 80vw" className="object-cover" />
          </div>
        </HeroEgg>
      </div>
    </section>
  );
}
