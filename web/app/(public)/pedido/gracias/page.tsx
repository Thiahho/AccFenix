import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { MessageCircleIcon } from "lucide-react";
import { ClearCartOnPaid, PaymentPoller } from "@/components/site/checkout-follow-up";
import { PosterHead } from "@/components/site/poster-head";
import { Button } from "@/components/ui/button";
import { clientIpHeaders } from "@/lib/admin/client-ip";
import { api, baseUrl } from "@/lib/api";
import type { OrderPayment } from "@/lib/orders/types";
import { buildComprobanteMessage, whatsappUrl } from "@/lib/whatsapp";

// The return URL carries the order's review token, so it is never sent as a referrer.
export const metadata: Metadata = { title: "Gracias por tu pedido", robots: { index: false }, referrer: "no-referrer" };

/** With the payment id Mercado Pago adds to the return URL, the API verifies that payment instead of waiting for the webhook. */
async function paymentOf(number: number, paymentId: string | null): Promise<OrderPayment | null> {
  try {
    const url = `${baseUrl()}/api/orders/${number}/payment`;
    const confirmed = paymentId
      ? await fetch(`${url}/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...clientIpHeaders(await headers(), process.env.API_TRUSTED_KEY) },
          body: JSON.stringify({ paymentId }),
          cache: "no-store",
        })
      : null;
    const res = confirmed?.ok ? confirmed : await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as OrderPayment;
  } catch {
    return null;
  }
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="mx-4 my-8 max-w-2xl border border-border bg-cream p-6 sm:mx-6 sm:p-8 lg:mx-8">{children}</div>;
}

export default async function ThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string; resena?: string | string[]; payment_id?: string | string[] }>;
}) {
  const { pedido, resena, payment_id: rawPaymentId } = await searchParams;
  const paymentId = typeof rawPaymentId === "string" && /^\d{1,30}$/.test(rawPaymentId) ? rawPaymentId : null;
  const number = Number(pedido);
  const valid = Number.isInteger(number) && number > 0;
  const reviewToken = typeof resena === "string" && /^[0-9a-f]{32}$/.test(resena) ? resena : null;
  const [payment, settings] = await Promise.all([
    valid ? paymentOf(number, paymentId) : Promise.resolve(null),
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
          <h2 className="poster-display text-2xl sm:text-3xl">Pago acreditado</h2>
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
          {reviewToken && (
            <p className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
              Cuando lo pruebes,{" "}
              <Link href={`/resena?token=${reviewToken}`} className="font-semibold text-caramel-deep underline underline-offset-4">
                dejá tu reseña
              </Link>
              . Guardá este enlace para volver.
            </p>
          )}
        </Panel>
      )}

      {valid && payment?.paymentStatus === "refunded" && (
        <Panel>
          <h2 className="poster-display text-2xl sm:text-3xl">Pago devuelto</h2>
          <p className="mt-2 max-w-md text-pretty text-muted-foreground">
            El pago de este pedido fue devuelto. Si tenés dudas, escribinos por WhatsApp con el número de pedido.
          </p>
        </Panel>
      )}

      {valid && payment && payment.paymentStatus !== "approved" && payment.paymentStatus !== "refunded" && (
        <Panel>
          <PaymentPoller />
          <h2 className="poster-display text-2xl sm:text-3xl">Estamos confirmando tu pago</h2>
          <p className="mt-2 max-w-md text-pretty text-muted-foreground">
            Mercado Pago todavía no nos confirmó el pago. Esta página se actualiza sola. Cuando se acredite, vas a ver el botón para enviar el comprobante.
          </p>
        </Panel>
      )}

      {valid && !payment && (
        <Panel>
          <h2 className="poster-display text-2xl sm:text-3xl">No pudimos verificar el pago</h2>
          <p className="mt-2 max-w-md text-pretty text-muted-foreground">
            Probá de nuevo en unos minutos. Si ya pagaste, escribinos por WhatsApp con el número de pedido.
          </p>
        </Panel>
      )}
    </div>
  );
}
