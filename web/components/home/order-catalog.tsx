import { ProductCard } from "@/components/home/product-card";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import type { ProductDetail } from "@/lib/api";

type Props = { products: ProductDetail[]; phone: string; threshold: number };

/** Order grid: one card per product so the visitor can build the order or ask by WhatsApp. */
export function OrderCatalog({ products, phone, threshold }: Props) {
  const orderable = products.filter((p) => p.variants.length > 0);

  return (
    <section id="catalogo" className="anchor-section border-b bg-background" aria-labelledby="catalogo-titulo">
      <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <Reveal>
          <p className="eyebrow text-yolk">Hacé tu pedido</p>
          <h2 id="catalogo-titulo" className="title-display mt-3 max-w-2xl text-4xl sm:text-5xl">
            Elegí la presentación y sumala al pedido
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground text-pretty">
            Armá tu pedido acá y envialo por WhatsApp con el total calculado, o tocá <span className="font-medium text-foreground">Pedir por WhatsApp</span> para consultar por una presentación.
          </p>
        </Reveal>

        {orderable.length === 0 ? (
          <p className="mt-10 text-muted-foreground">El catálogo no está disponible en este momento. Probá de nuevo en unos minutos.</p>
        ) : (
          <Stagger as="ul" stagger={0.1} className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orderable.map((product) => (
              <StaggerItem as="li" key={product.id} y={24}>
                <ProductCard product={product} phone={phone} threshold={threshold} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </section>
  );
}
