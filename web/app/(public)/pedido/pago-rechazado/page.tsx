import type { Metadata } from "next";
import Link from "next/link";
import { PosterHead } from "@/components/site/poster-head";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Pago no completado", robots: { index: false } };

export default function PaymentRejectedPage() {
  return (
    <>
      <PosterHead label="Pago" title="El pago no se completó" />
      <div className="mx-4 my-8 max-w-2xl border-[3px] border-espresso bg-cream p-6 sm:mx-6 sm:p-8 lg:mx-8">
        <p className="text-pretty text-muted-foreground">
          Tus productos siguen en el pedido. Podés intentar el pago de nuevo o elegir otro medio desde Mercado Pago.
        </p>
        <Button asChild className="mt-6"><Link href="/pedido">Volver al pedido</Link></Button>
      </div>
    </>
  );
}
