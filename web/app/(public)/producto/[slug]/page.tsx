import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { baseOpenGraph } from "@/components/seo/open-graph";
import { VariantPicker } from "@/components/site/variant-picker";
import { api, NotFoundError, type ProductDetail } from "@/lib/api";
import { site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

/*
 * No slugs are prerendered (the build must not depend on the API), but declaring the params makes the route ISR:
 * each product renders on its first request and is then cached with the fetch revalidation (60 s, "catalog" tag).
 * Admin catalog writes call updateTag("catalog"); the no-store live variant check runs only in the order view
 * (client side), so nothing here forces dynamic rendering.
 */
export const dynamicParams = true;
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return [];
}

async function load(slug: string) {
  try {
    return await api.product(slug);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await load(slug);
  const cover = product.media.find((m) => m.type === "image")?.url;
  return {
    title: product.name,
    description: product.description ?? `${product.name} — ${product.category.name}`,
    alternates: { canonical: `/producto/${product.slug}` },
    // Setting openGraph replaces the inherited one, so only do it when there is a cover to show;
    // otherwise the page keeps the site-wide generated image.
    openGraph: cover ? { ...baseOpenGraph, images: [cover] } : undefined,
  };
}

/** schema.org Product. Offers only list variants with a published retail price (ARS); the rest are quoted on request. */
function productSchema(product: ProductDetail) {
  const url = `${site.url}/producto/${product.slug}`;
  const images = product.media.filter((m) => m.type === "image").map((m) => m.url);
  const priced = product.variants.filter((v) => v.retailPrice !== null);
  const prices = priced.map((v) => v.retailPrice as number);
  const availability = priced.some((v) => v.availability === "disponible")
    ? "https://schema.org/InStock"
    : "https://schema.org/MadeToOrder";

  const offers =
    priced.length === 0
      ? undefined
      : priced.length === 1
        ? { "@type": "Offer", url, priceCurrency: "ARS", price: prices[0], availability }
        : {
            "@type": "AggregateOffer",
            url,
            priceCurrency: "ARS",
            lowPrice: Math.min(...prices),
            highPrice: Math.max(...prices),
            offerCount: priced.length,
            availability,
          };

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url,
    category: product.category.name,
    ...(product.description && { description: product.description }),
    ...(images.length > 0 && { image: images }),
    ...(offers && { offers }),
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await load(slug);

  return (
    <div>
      <JsonLd data={productSchema(product)} />
      <VariantPicker product={product} />
    </div>
  );
}
