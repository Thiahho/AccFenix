import type { Metadata } from "next";
import Link from "next/link";
import { CreditCardIcon } from "lucide-react";
import { MenuPill } from "@/components/site/menu-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Pago no completado", robots: { index: false } };

export default function PaymentRejectedPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <MenuPill icon={CreditCardIcon} tone="caramel">Pago</MenuPill>
      <h1 className="title-display mt-4 text-4xl sm:text-5xl">El pago no se completó</h1>
      <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-caramel/70 bg-card p-6 text-center sm:p-8">
        <p className="text-pretty text-muted-foreground">
          Tus productos siguen en el pedido. Podés intentar el pago de nuevo o elegir otro medio desde Mercado Pago.
        </p>
        <Button asChild className="mt-6"><Link href="/pedido">Volver al pedido</Link></Button>
      </div>
    </div>
  );
}
