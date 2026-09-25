import Link from "next/link";
import { ArrowDownIcon, MessageCircleIcon } from "lucide-react";
import { PhotoSlot } from "@/components/home/photo-slot";
import { Button } from "@/components/ui/button";
import { heroImage } from "@/lib/home-content";
import { whatsappUrl } from "@/lib/whatsapp";

export function Hero({ phone }: { phone: string }) {
  return (
    <section className="bg-brand text-brand-foreground">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 md:grid-cols-[1.05fr_1fr] md:py-20">
        <div>
          <h1 className="font-display text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
            El barral que sostiene tu cortina, a la medida de cada ventana.
          </h1>
          <p className="mt-5 max-w-md text-lg text-brand-foreground/80 text-pretty">
            Barrales de madera en 10 medidas, 2 grosores y 3 colores. Venta minorista y mayorista, con cotización por WhatsApp.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-11 w-full bg-brand-foreground px-5 text-base sm:w-auto md:h-11 text-brand hover:bg-brand-foreground/90">
              <Link href="#catalogo">
                Ver medidas <ArrowDownIcon aria-hidden />
              </Link>
            </Button>
            {phone && (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 w-full border-brand-foreground/40 bg-transparent px-5 text-base sm:w-auto md:h-11 text-brand-foreground hover:bg-brand-foreground/10 hover:text-brand-foreground"
              >
                <a href={whatsappUrl(phone, "¡Hola! Quiero consultar por barrales.")} target="_blank" rel="noopener noreferrer">
                  <MessageCircleIcon aria-hidden /> Escribinos
                </a>
              </Button>
            )}
          </div>
        </div>
        <PhotoSlot
          src={heroImage}
          alt="Cortina colgada de un barral Fénix ya instalado"
          hint="Foto principal: cortina con barral Fénix bien instalado"
          priority
          sizes="(min-width: 768px) 45vw, 100vw"
          className="aspect-[4/3] rounded-2xl sm:aspect-[4/5] ring-1 ring-brand-foreground/15 md:aspect-[5/6]"
        />
      </div>
    </section>
  );
}
