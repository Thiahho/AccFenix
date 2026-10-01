import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductImage } from "@/components/site/product-image";
import { api, NotFoundError } from "@/lib/api";

type Props = { params: Promise<{ categoria: string }> };

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
  return { title: category.name, description: category.description ?? undefined };
}

export default async function CategoryPage({ params }: Props) {
  const { categoria } = await params;
  const { category, products } = await load(categoria);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav aria-label="Ruta" className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Inicio</Link> / <span className="text-foreground">{category.name}</span>
      </nav>
      <p className="eyebrow mt-6 text-brass">Catálogo</p>
      <h1 className="title-serif mt-3 text-4xl sm:text-5xl">{category.name}</h1>
      {category.description && <p className="mt-2 max-w-2xl text-muted-foreground">{category.description}</p>}

      {products.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Todavía no hay productos en este catálogo.</p>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-8 lg:grid-cols-3">
          {products.map((p) => (
            <li key={p.id}>
              <Link
                href={`/producto/${p.slug}`}
                className="group flex min-h-24 items-center gap-4 rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:block"
              >
                <ProductImage
                  src={p.coverUrl}
                  alt={p.name}
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 128px"
                  className="w-32 shrink-0 transition-opacity group-hover:opacity-90 sm:w-full"
                />
                <div className="min-w-0">
                  <h2 className="font-medium transition-colors group-hover:text-brass sm:mt-3">{p.name}</h2>
                  {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
