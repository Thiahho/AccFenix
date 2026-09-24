import Link from "next/link";
import { CartButton } from "@/components/site/cart-button";
import { api, type Category } from "@/lib/api";
import { site } from "@/lib/site";

async function loadCategories(): Promise<Category[]> {
  try {
    return await api.categories();
  } catch {
    return []; // Si la API no responde, el header igual se renderiza.
  }
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const categories = await loadCategories();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            {/* Placeholder del logo del cliente */}
            <span aria-hidden className="grid size-8 place-items-center rounded-md bg-brand text-sm font-bold text-brand-foreground">
              {site.name.charAt(0)}
            </span>
            <span className="text-lg">{site.name}</span>
          </Link>
          <nav aria-label="Catálogos" className="hidden flex-1 items-center gap-5 text-sm md:flex">
            {categories.map((c) => (
              <Link key={c.id} href={`/catalogo/${c.slug}`} className="text-muted-foreground transition-colors hover:text-foreground">
                {c.name}
              </Link>
            ))}
          </nav>
          <div className="ml-auto md:ml-0">
            <CartButton />
          </div>
        </div>
        {categories.length > 0 && (
          <nav aria-label="Catálogos" className="flex gap-4 overflow-x-auto border-t px-4 py-2 text-sm md:hidden">
            {categories.map((c) => (
              <Link key={c.id} href={`/catalogo/${c.slug}`} className="shrink-0 text-muted-foreground hover:text-foreground">
                {c.name}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-brand-soft">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <p>
            <span className="font-medium text-foreground">{site.name}</span> · {site.tagline}
          </p>
          <p>Precios y envío se coordinan por WhatsApp al recibir tu pedido.</p>
        </div>
      </footer>
    </div>
  );
}
