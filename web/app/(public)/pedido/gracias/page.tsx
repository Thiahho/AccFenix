import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircleIcon } from "lucide-react";
import { ClearCartOnPaid, PaymentPoller } from "@/components/site/checkout-follow-up";
import { PosterHead } from "@/components/site/poster-head";
import { Button } from "@/components/ui/button";
import { api, baseUrl } from "@/lib/api";
import type { OrderPayment } from "@/lib/orders/types";
import { buildComprobanteMessage, whatsappUrl } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Gracias por tu pedido", robots: { index: false } };

async function paymentOf(number: number): Promise<OrderPayment | null> {
  try {
    const res = await fetch(`${baseUrl()}/api/orders/${number}/payment`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as OrderPayment;
  } catch {
    return null;
  }
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="mx-4 my-8 max-w-2xl border-[3px] border-espresso bg-cream p-6 sm:mx-6 sm:p-8 lg:mx-8">{children}</div>;
}

export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  const { pedido } = await searchParams;
  const number = Number(pedido);
  const valid = Number.isInteger(number) && number > 0;
  const [payment, settings] = await Promise.all([
    valid ? paymentOf(number) : Promise.resolve(null),
    api.settings().catch(() => ({ whatsappNumber: "" })),
  ]);

  return (
    <div>
      <PosterHead label={`Pedido ${valid ? `#${number}` : ""}`} title="¡Gracias!" />

      {!valid && (
        <Panel>
          <p className="text-muted-foreground">No encontramos un pedido para mostrar.</p>
          <Button asChild className="mt-6"><Link href="/">Volver a la carta</Link></Button>
        </Panel>
      )}

      {valid && payment?.paymentStatus === "approved" && (
        <Panel>
          <ClearCartOnPaid />
          <h2 className="poster-display text-4xl">Pago acreditado</h2>
          <p className="mt-2 max-w-md text-pretty text-muted-foreground">
            Ya le llegó el pedido al local. Mandanos el comprobante por WhatsApp para coordinar el horario.
          </p>
          {settings.whatsappNumber ? (
            <Button asChild size="lg" className="mt-6 h-12 w-full gap-2 sm:w-auto">
              <a href={whatsappUrl(settings.whatsappNumber, buildComprobanteMessage(number))} target="_blank" rel="noopener noreferrer">
                <MessageCircleIcon aria-hidden className="size-5" /> Enviar comprobante por WhatsApp
              </a>
            </Button>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">Te contactamos por WhatsApp para coordinar el horario.</p>
          )}
        </Panel>
      )}

      {valid && payment?.paymentStatus !== "approved" && payment && (
        <Panel>
          <PaymentPoller />
          <h2 className="poster-display text-4xl">Estamos confirmando tu pago</h2>
          <p className="mt-2 max-w-md text-pretty text-muted-foreground">
            Mercado Pago todavía no nos confirmó el pago. Esta página se actualiza sola. Cuando se acredite, vas a ver el botón para enviar el comprobante.
          </p>
        </Panel>
      )}

      {valid && !payment && (
        <Panel>
          <h2 className="poster-display text-4xl">No pudimos verificar el pago</h2>
          <p className="mt-2 max-w-md text-pretty text-muted-foreground">
            Probá de nuevo en unos minutos. Si ya pagaste, escribinos por WhatsApp con el número de pedido.
          </p>
        </Panel>
      )}
    </div>
  );
}
