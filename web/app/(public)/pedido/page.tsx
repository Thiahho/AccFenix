import type { Metadata } from "next";
import { ShoppingBagIcon } from "lucide-react";
import { MenuPill } from "@/components/site/menu-card";
import { OrderView } from "@/components/site/order-view";

export const metadata: Metadata = { title: "Mi pedido", robots: { index: false } };

export default async function OrderPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <MenuPill icon={ShoppingBagIcon}>Pedido</MenuPill>
      <h1 className="title-display mt-4 text-4xl sm:text-5xl">Mi pedido</h1>
      <p className="mt-2 text-muted-foreground">Revisá los productos, completá tus datos y pagá con Mercado Pago. El pedido llega al local cuando se acredita el pago.</p>
      <OrderView />
    </div>
  );
}
