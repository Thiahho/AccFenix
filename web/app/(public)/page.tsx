import { Faq } from "@/components/home/faq";
import { Hero } from "@/components/home/hero";
import { HowWeWork } from "@/components/home/how-we-work";
import { OrderCatalog } from "@/components/home/order-catalog";
import { PriceBoard } from "@/components/home/price-board";
import { Wholesale } from "@/components/home/wholesale";
import { api, type PublicSettings } from "@/lib/api";
import { loadCatalogProducts } from "@/lib/catalog";

async function loadSettings(): Promise<PublicSettings> {
  try {
    return await api.settings();
  } catch {
    return { whatsappNumber: "", wholesaleThreshold: 0 }; // Sin API, la home se muestra sin botones de WhatsApp.
  }
}

export default async function HomePage() {
  const [settings, products] = await Promise.all([loadSettings(), loadCatalogProducts()]);

  return (
    <>
      <Hero phone={settings.whatsappNumber} />
      <PriceBoard products={products} threshold={settings.wholesaleThreshold} />
      <OrderCatalog products={products} phone={settings.whatsappNumber} threshold={settings.wholesaleThreshold} />
      <HowWeWork />
      <Wholesale phone={settings.whatsappNumber} threshold={settings.wholesaleThreshold} />
      <Faq />
    </>
  );
}
