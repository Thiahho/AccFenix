import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, CupSodaIcon } from "lucide-react";
import { MenuPill } from "@/components/site/menu-card";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
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
    <div className="mx-auto max-w-6xl px-4 py-10">
      <JsonLd data={breadcrumb} />
      <nav aria-label="Ruta" className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Inicio</Link> / <span className="text-foreground">{category.name}</span>
      </nav>
      <MenuPill icon={CupSodaIcon} className="mt-6">Catálogo</MenuPill>
      <h1 className="title-display mt-4 text-4xl sm:text-5xl">{category.name}</h1>
      {category.description && <p className="mt-2 max-w-2xl text-muted-foreground">{category.description}</p>}

      {cards.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Todavía no hay productos en este catálogo.</p>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-8 lg:grid-cols-3">
          {cards.map((p) => {
            // Without its detail the card still links to the product; it just cannot state a price.
            const variants = variantsBySlug.get(p.slug);
            return (
            <li key={p.id}>
              <Link
                href={`/producto/${p.slug}`}
                className="group flex h-full min-h-24 items-center gap-4 rounded-2xl border border-caramel/70 bg-card p-3 transition-colors hover:border-espresso focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:flex-col sm:items-stretch"
              >
                <ProductImage
                  src={p.coverUrl}
                  alt={p.name}
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 128px"
                  className="w-32 shrink-0 transition-opacity group-hover:opacity-90 sm:w-full"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <h2 className="font-medium transition-colors group-hover:text-caramel-deep">{p.name}</h2>
                  {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-2">
                    {variants && (
                      <span className="font-heading font-extrabold whitespace-nowrap tabular-nums">
                        {priceFromText(variants.map((v) => v.retailPrice))}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-sm font-semibold whitespace-nowrap text-caramel-deep">
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
    </div>
  );
}
