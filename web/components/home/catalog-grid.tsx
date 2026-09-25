import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { BarralCard } from "@/components/home/barral-card";
import { api, NotFoundError, type ProductDetail } from "@/lib/api";

async function loadBarral(): Promise<ProductDetail | null> {
  try {
    return await api.product("barral");
  } catch (e) {
    if (e instanceof NotFoundError) return null;
    return null; // Si la API no responde, la home igual se renderiza.
  }
}

export async function CatalogGrid({ phone }: { phone: string }) {
  const product = await loadBarral();
  const medidaAttr = product?.attributes.find((a) => a.slug === "medida");
  const grosorAttr = product?.attributes.find((a) => a.slug === "grosor");
  const colorAttr = product?.attributes.find((a) => a.slug === "color");

  return (
    <section id="catalogo" className="anchor-section border-y bg-brand-soft/60" aria-labelledby="catalogo-titulo">
      <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <h2 id="catalogo-titulo" className="font-display max-w-xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Elegí tu barral: grosor, medida y color
        </h2>
        <p className="mt-3 max-w-xl text-muted-foreground text-pretty">
          Tocá <span className="font-medium text-foreground">Pedir por WhatsApp</span> en la medida que te sirve y te respondemos con la cotización. También podés sumar varias al pedido.
        </p>

        {!product || !medidaAttr || !grosorAttr || !colorAttr ? (
          <p className="mt-10 text-muted-foreground">El catálogo no está disponible en este momento. Probá de nuevo en unos minutos.</p>
        ) : (
          grosorAttr.values.map((grosor) => (
            <div key={grosor.id} className="mt-12">
              <h3 className="font-display text-2xl font-semibold tracking-tight">Grosor {grosor.label}</h3>
              <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
                {medidaAttr.values
                  .filter((m) => product.variants.some((v) => v.valueIds.includes(m.id) && v.valueIds.includes(grosor.id)))
                  .map((medida) => (
                    <li key={medida.id}>
                      <BarralCard
                        productSlug={product.slug}
                        productName={product.name}
                        categoryName={product.category.name}
                        medidaAttr={medidaAttr}
                        grosorAttr={grosorAttr}
                        colorAttr={colorAttr}
                        medida={medida}
                        grosor={grosor}
                        variants={product.variants}
                        media={product.media}
                        phone={phone}
                      />
                    </li>
                  ))}
              </ul>
            </div>
          ))
        )}

        <p className="mt-8 flex flex-wrap gap-x-6 text-sm">
          <Link href="/catalogo/kits" className="inline-flex min-h-11 items-center gap-1 font-medium text-brand hover:underline">
            Ver kits completos <ArrowRightIcon aria-hidden className="size-4" />
          </Link>
          <Link href="/catalogo/accesorios" className="inline-flex min-h-11 items-center gap-1 font-medium text-brand hover:underline">
            Ver accesorios <ArrowRightIcon aria-hidden className="size-4" />
          </Link>
        </p>
      </div>
    </section>
  );
}
