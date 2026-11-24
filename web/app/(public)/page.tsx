import type { Metadata } from "next";
import { Faq } from "@/components/home/faq";
import { Hero } from "@/components/home/hero";
import { HowWeWork } from "@/components/home/how-we-work";
import { PriceBoard } from "@/components/home/price-board";
import { Testimonials } from "@/components/home/testimonials";
import { JsonLd } from "@/components/seo/json-ld";
import { api, type PublicSettings, type Testimonial } from "@/lib/api";
import { loadCatalogProducts } from "@/lib/catalog";
import { site } from "@/lib/site";

export const metadata: Metadata = { alternates: { canonical: "/" } };

async function loadSettings(): Promise<PublicSettings> {
  try {
    return await api.settings();
  } catch {
    return { whatsappNumber: "", mercadoPagoAlias: "" }; // Sin API, la home se muestra sin botones de WhatsApp.
  }
}

async function loadTestimonials(): Promise<Testimonial[]> {
  try {
    return await api.testimonials();
  } catch {
    return []; // Sin API, la home se muestra sin la sección de clientes.
  }
}

function organization(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: site.url,
    description: site.description,
    logo: `${site.url}/icon.png`,
    ...(digits && { telephone: `+${digits}` }),
  };
}

export default async function HomePage() {
  const [settings, products, testimonials] = await Promise.all([loadSettings(), loadCatalogProducts(), loadTestimonials()]);

  return (
    <>
      <JsonLd data={organization(settings.whatsappNumber)} />
      <Hero />
      <PriceBoard products={products} />
      <Testimonials items={testimonials} />
      <HowWeWork />
      <Faq />
    </>
  );
}
