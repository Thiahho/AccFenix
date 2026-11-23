import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Pago no completado", robots: { index: false } };

export default function PaymentRejectedPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="eyebrow text-caramel-deep">Pago</p>
      <h1 className="title-display mt-3 text-4xl sm:text-5xl">El pago no se completó</h1>
      <div className="mx-auto mt-10 max-w-xl rounded-xl border bg-brand-soft/50 p-6 text-center sm:p-8">
        <p className="text-pretty text-muted-foreground">
          Tus productos siguen en el pedido. Podés intentar el pago de nuevo o elegir otro medio desde Mercado Pago.
        </p>
        <Button asChild className="mt-6"><Link href="/pedido">Volver al pedido</Link></Button>
      </div>
    </div>
  );
}
