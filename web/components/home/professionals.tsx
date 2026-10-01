import { MessageCircleIcon } from "lucide-react";
import { proConditions } from "@/lib/home-content";
import { buildProfessionalMessage, whatsappUrl } from "@/lib/whatsapp";

export function Professionals({ phone, threshold }: { phone: string; threshold: number }) {
  return (
    <section id="profesionales" className="anchor-section bg-navy text-ivory" aria-labelledby="pro-titulo">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 md:items-center md:gap-16 md:py-24">
        <div>
          <span className="eyebrow text-brass-light">Profesionales</span>
          <h2 id="pro-titulo" className="title-serif mt-3 text-4xl sm:text-5xl">
            ¿Sos decorador, tapicero o revendedor?
          </h2>
          <p className="mt-4 max-w-md text-lg text-ivory/75 text-pretty">
            Trabajamos por volumen.
            {threshold > 0 && <> Los pedidos desde {threshold} unidades se tratan como mayoristas.</>} Contanos qué necesitás y te cotizamos.
          </p>
          {phone && (
            <a
              href={whatsappUrl(phone, buildProfessionalMessage(threshold))}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ivory px-7 text-[15px] font-semibold text-navy transition-colors hover:bg-white focus-visible:ring-3 focus-visible:ring-brass-light focus-visible:outline-none sm:w-auto"
            >
              <MessageCircleIcon aria-hidden className="size-4" /> Cotizar por volumen
            </a>
          )}
        </div>
        <ul>
          {proConditions.map((c, i) => (
            <li key={c} className="flex gap-4 border-t border-ivory/25 py-4 last:border-b">
              <span aria-hidden className="font-serif text-3xl leading-none text-brass-light">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="leading-relaxed text-ivory/85 text-pretty">{c}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
