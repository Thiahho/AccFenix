import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { CatalogBrowser } from "@/components/home/catalog-browser";
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
    <section id="catalogo" className="anchor-section border-y bg-ivory" aria-labelledby="catalogo-titulo">
      <div className="mx-auto max-w-6xl px-4 py-12 md:py-20">
        <span className="eyebrow text-brass">Catálogo</span>
        <h2 id="catalogo-titulo" className="title-serif mt-3 max-w-xl text-4xl sm:text-5xl">
          Elegí tu barral: grosor, medida y color
        </h2>
        <p className="mt-3 max-w-xl text-muted-foreground text-pretty">
          Elegí grosor, medida y color con los botones. Tocá <span className="font-medium text-foreground">Pedir por WhatsApp</span> en la medida que te sirve y te respondemos con la cotización. También podés sumar varias al pedido.
        </p>

        {!product || !medidaAttr || !grosorAttr || !colorAttr ? (
          <p className="mt-10 text-muted-foreground">El catálogo no está disponible en este momento. Probá de nuevo en unos minutos.</p>
        ) : (
          <CatalogBrowser product={product} medidaAttr={medidaAttr} grosorAttr={grosorAttr} colorAttr={colorAttr} phone={phone} />
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
