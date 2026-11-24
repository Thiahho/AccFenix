import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { PosterHead } from "@/components/site/poster-head";
import { ProductImage } from "@/components/site/product-image";
import { api, NotFoundError } from "@/lib/api";
import { loadVariantsBySlug, uniqueDescriptions } from "@/lib/catalog";
import { priceFromText } from "@/lib/pricing";
import { site } from "@/lib/site";

type Props = { params: Promise<{ categoria: string }> };

/*
 * No slugs are prerendered (the build must not depend on the API), but declaring the params makes the route ISR:
 * each catalog renders on its first request and is then cached with the fetch revalidation (60 s, "catalog" tag).
 * Unknown slugs still render on demand and return 404 through notFound().
 */
export const dynamicParams = true;
export async function generateStaticParams(): Promise<{ categoria: string }[]> {
  return [];
}

async function load(slug: string) {
  try {
    return await api.categoryProducts(slug);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria } = await params;
  const { category } = await load(categoria);
  return {
    title: category.name,
    description: category.description ?? undefined,
    alternates: { canonical: `/catalogo/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { categoria } = await params;
  const { category, products } = await load(categoria);
  const variantsBySlug = await loadVariantsBySlug(products.map((p) => p.slug));
  const cards = uniqueDescriptions(products, category.description);
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: site.url },
      { "@type": "ListItem", position: 2, name: category.name, item: `${site.url}/catalogo/${category.slug}` },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumb} />
      <PosterHead
        label="Catálogo"
        title={category.name}
        top={
          <nav aria-label="Ruta" className="mb-5 text-sm text-cream">
            <Link href="/" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-latte">Inicio</Link> / <span>{category.name}</span>
          </nav>
        }
      >
        {category.description}
      </PosterHead>

      {cards.length === 0 ? (
        <p className="px-4 py-10 text-muted-foreground sm:px-6 lg:px-8">Todavía no hay productos en este catálogo.</p>
      ) : (
        <ul className="grid lg:grid-cols-2">
          {cards.map((p) => {
            // Without its detail the row still links to the product; it just cannot state a price.
            const variants = variantsBySlug.get(p.slug);
            return (
              <li key={p.id} className="border-b border-border lg:odd:border-r">
                <Link
                  href={`/producto/${p.slug}`}
                  className="poster-focus-inset group flex h-full min-h-32 items-stretch gap-4 px-4 py-5 transition-colors hover:bg-oat sm:px-6 lg:px-8"
                >
                  {p.coverUrl && (
                    <ProductImage src={p.coverUrl} alt={p.name} sizes="128px" className="w-24 shrink-0 self-center sm:w-32" />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h2 className="poster-display text-2xl leading-[1.2] sm:text-3xl sm:leading-[1.2]">{p.name}</h2>
                    {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-3">
                      {variants && <span className="poster-price text-2xl whitespace-nowrap">{priceFromText(variants.map((v) => v.retailPrice))}</span>}
                      <span className="poster-label inline-flex items-center gap-1 whitespace-nowrap">
                        {variants && variants.length > 1 ? "Elegir tamaño" : "Ver producto"}
                        <ArrowRightIcon aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
