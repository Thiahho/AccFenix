import type { Metadata } from "next";
import { OrderView } from "@/components/site/order-view";

export const metadata: Metadata = { title: "Mi pedido", robots: { index: false } };

export default async function OrderPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="eyebrow text-caramel-deep">Pedido</p>
      <h1 className="title-display mt-3 text-4xl sm:text-5xl">Mi pedido</h1>
      <p className="mt-2 text-muted-foreground">Revisá los productos, completá tus datos y pagá con Mercado Pago. El pedido llega al local cuando se acredita el pago.</p>
      <OrderView />
    </div>
  );
}
