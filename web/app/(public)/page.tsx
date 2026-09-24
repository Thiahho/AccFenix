import Link from "next/link";
import { ArrowRightIcon, MessageCircleIcon, ListChecksIcon, TruckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type Category } from "@/lib/api";
import { site } from "@/lib/site";

const steps = [
  { icon: ListChecksIcon, title: "Armá tu pedido", text: "Elegí barrales, accesorios o kits, con medida, grosor y color." },
  { icon: MessageCircleIcon, title: "Envialo por WhatsApp", text: "Te llega un mensaje con el detalle completo, listo para enviar." },
  { icon: TruckIcon, title: "Coordinamos el envío", text: "Te cotizamos y acordamos la entrega en Buenos Aires o por expreso." },
];

export default async function HomePage() {
  let categories: Category[] = [];
  try {
    categories = await api.categories();
  } catch {
    // Se muestra el estado vacío más abajo.
  }

  return (
    <>
      <section className="border-b bg-brand-soft">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <p className="text-sm font-medium tracking-wide text-brand uppercase">{site.tagline}</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Barrales de madera a medida de cada ventana
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground text-pretty">
            Venta minorista y mayorista. Armá tu pedido con todas las variantes que necesites y recibí la cotización por WhatsApp.
          </p>
          {categories[0] && (
            <Button asChild size="lg" className="mt-8">
              <Link href={`/catalogo/${categories[0].slug}`}>
                Ver catálogo <ArrowRightIcon aria-hidden />
              </Link>
            </Button>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14" aria-labelledby="catalogos">
        <h2 id="catalogos" className="text-2xl font-semibold tracking-tight">Catálogos</h2>
        {categories.length === 0 ? (
          <p className="mt-4 text-muted-foreground">El catálogo no está disponible en este momento. Probá de nuevo en unos minutos.</p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/catalogo/${c.slug}`}
                  className="group flex h-full flex-col rounded-xl border p-6 transition-colors hover:border-brand hover:bg-brand-soft/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="text-xl font-semibold">{c.name}</span>
                  {c.description && <span className="mt-2 text-sm text-muted-foreground">{c.description}</span>}
                  <span className="mt-auto flex items-center gap-1 pt-6 text-sm font-medium text-brand">
                    {c.productCount} {c.productCount === 1 ? "producto" : "productos"}
                    <ArrowRightIcon aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t" aria-labelledby="como-funciona">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 id="como-funciona" className="text-2xl font-semibold tracking-tight">Cómo funciona</h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                  <s.icon aria-hidden className="size-5" />
                </span>
                <div>
                  <p className="font-medium">
                    <span className="sr-only">Paso {i + 1}: </span>
                    {s.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
