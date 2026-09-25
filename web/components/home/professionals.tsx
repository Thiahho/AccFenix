import { MessageCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { proConditions } from "@/lib/home-content";
import { buildProfessionalMessage, whatsappUrl } from "@/lib/whatsapp";

export function Professionals({ phone, threshold }: { phone: string; threshold: number }) {
  return (
    <section id="profesionales" className="anchor-section bg-brand text-brand-foreground" aria-labelledby="pro-titulo">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2 md:py-16 md:items-center">
        <div>
          <h2 id="pro-titulo" className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            ¿Sos decorador, tapicero o revendedor?
          </h2>
          <p className="mt-4 max-w-md text-lg text-brand-foreground/80 text-pretty">
            Trabajamos por volumen.
            {threshold > 0 && <> Los pedidos desde {threshold} unidades se tratan como mayoristas.</>} Contanos qué necesitás y te cotizamos.
          </p>
          {phone && (
            <Button asChild size="lg" className="mt-8 h-11 w-full bg-brand-foreground px-5 sm:w-auto md:h-11 text-base text-brand hover:bg-brand-foreground/90">
              <a href={whatsappUrl(phone, buildProfessionalMessage(threshold))} target="_blank" rel="noopener noreferrer">
                <MessageCircleIcon aria-hidden /> Cotizar por volumen
              </a>
            </Button>
          )}
        </div>
        <ul className="divide-y divide-brand-foreground/20 border-y border-brand-foreground/20">
          {proConditions.map((c) => (
            <li key={c} className="py-4 text-brand-foreground/90 text-pretty">
              {c}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
