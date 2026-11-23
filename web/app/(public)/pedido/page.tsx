import type { Metadata } from "next";
import { OrderView } from "@/components/site/order-view";
import { PosterHead } from "@/components/site/poster-head";

export const metadata: Metadata = { title: "Mi pedido", robots: { index: false } };

export default async function OrderPage() {
  return (
    <>
      <PosterHead label="Pedido" title="Mi pedido">
        Revisá los productos, completá tus datos y pagá con Mercado Pago. El pedido llega al local cuando se acredita el pago.
      </PosterHead>
      <div className="px-4 pb-10 sm:px-6 lg:px-8">
        <OrderView />
      </div>
    </>
  );
}
