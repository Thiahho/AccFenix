import type { Metadata } from "next";
import { OrderView } from "@/components/site/order-view";
import { api, type PublicSettings } from "@/lib/api";

export const metadata: Metadata = { title: "Mi pedido", robots: { index: false } };

export default async function OrderPage() {
  let settings: PublicSettings = { whatsappNumber: "", wholesaleThreshold: 100 };
  try {
    settings = await api.settings();
  } catch {
    // Sin API se puede ver el carrito; el envío queda deshabilitado si falta el número.
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="eyebrow text-brass">Pedido</p>
      <h1 className="title-serif mt-3 text-4xl sm:text-5xl">Mi pedido</h1>
      <p className="mt-2 text-muted-foreground">Revisá los productos, completá tus datos y envialo por WhatsApp para recibir la cotización.</p>
      <OrderView settings={settings} />
    </div>
  );
}
