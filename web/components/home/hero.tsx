import Image from "next/image";
import Link from "next/link";
import { ArrowDownIcon, MessageCircleIcon } from "lucide-react";
import { whatsappUrl } from "@/lib/whatsapp";

/** Portada que queda detrás de la cortina (ver CurtainIntro). Deja margen a los costados para los paños recogidos. */
export function Hero({ phone }: { phone: string }) {
  return (
    <section className="mx-auto grid h-full max-w-7xl items-center gap-10 px-8 py-10 text-navy md:grid-cols-[1.1fr_1fr] md:px-[calc(8vw+1.5rem)]">
      <div className="flex flex-col gap-6">
        <span className="text-xs font-semibold tracking-[0.3em] text-brass">BARRALES DE MADERA</span>
        <h1 className="font-serif text-5xl leading-[0.98] font-medium tracking-tight text-balance sm:text-6xl lg:text-7xl">
          El barral que <em className="font-normal text-brass">sostiene</em> tu cortina, a la medida de cada ventana.
        </h1>
        <p className="max-w-md text-lg text-pretty text-navy/75">
          Barrales de madera en 10 medidas, 2 grosores y 3 colores. Venta minorista y mayorista, con cotización por WhatsApp.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="#catalogo"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-navy px-7 text-[15px] font-semibold text-ivory transition-colors hover:bg-navy/90 focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
          >
            Ver medidas <ArrowDownIcon aria-hidden className="size-4" />
          </Link>
          {phone && (
            <a
              href={whatsappUrl(phone, "¡Hola! Quiero consultar por barrales.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 border-b border-navy px-4 text-[15px] font-semibold transition-colors hover:border-brass hover:text-brass focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
            >
              <MessageCircleIcon aria-hidden className="size-4" /> Escribinos
            </a>
          )}
        </div>
      </div>

      <div className="hidden h-full items-end justify-end gap-5 pb-4 md:flex">
        <div className="hidden flex-col gap-3 pb-3 lg:flex">
          <div className="relative h-56 w-40 overflow-hidden rounded-t-full rounded-b-sm">
            <Image src="/cortina-1.png" alt="Cortinas azules colgadas de un barral con argollas" fill sizes="160px" className="object-cover" />
          </div>
          <span className="font-serif text-lg text-navy/60 italic">Living con barral</span>
        </div>
        <div className="relative h-[min(560px,68svh)] w-[min(380px,100%)] overflow-hidden rounded-t-full rounded-b-sm shadow-[0_30px_60px_rgb(22_35_61/0.18)]">
          <Image src="/cortina-2.png" alt="Cortinas de ambiente colgadas de un barral de madera" fill priority sizes="380px" className="object-cover" />
        </div>
      </div>
    </section>
  );
}
