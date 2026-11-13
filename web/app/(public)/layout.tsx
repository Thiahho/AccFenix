import Link from "next/link";
import { WhatsappFab } from "@/components/home/whatsapp-fab";
import { MobileMenu } from "@/components/site/mobile-menu";
import { CartButton } from "@/components/site/cart-button";
import { Wordmark } from "@/components/site/wordmark";
import { OrderToaster } from "@/components/site/order-toast";
import { api, type Category } from "@/lib/api";
import { site } from "@/lib/site";

// Keep in sync with sectionLinks in lib/nav.ts (that module uses client hooks, so it is not imported here).
const sections = [
  { href: "/#precios", label: "Precios" },
  { href: "/#catalogo", label: "Hacé tu pedido" },
  { href: "/#mayoristas", label: "Mayoristas" },
  { href: "/#preguntas", label: "Preguntas" },
];

async function loadCategories(): Promise<Category[]> {
  try {
    return await api.categories();
  } catch {
    return []; // Si la API no responde, el header igual se renderiza.
  }
}

async function loadPhone(): Promise<string> {
  try {
    return (await api.settings()).whatsappNumber;
  } catch {
    return "";
  }
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [categories, phone] = await Promise.all([loadCategories(), loadPhone()]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
          <Link href="/" aria-label={`${site.name} — inicio`} className="flex min-h-11 items-center rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            <Wordmark className="text-4xl" />
          </Link>
          <nav aria-label="Secciones" className="hidden flex-1 items-center gap-5 text-sm md:flex">
            {sections.map((s) => (
              <Link key={s.href} href={s.href} className="rounded-sm font-medium text-muted-foreground transition-colors hover:text-brand focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                {s.label}
              </Link>
            ))}
            {categories.length > 0 && <span aria-hidden className="h-4 w-px bg-border" />}
            {categories.map((c) => (
              <Link key={c.id} href={`/catalogo/${c.slug}`} className="rounded-sm font-medium text-muted-foreground transition-colors hover:text-brand focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                {c.name}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <CartButton />
            <MobileMenu categories={categories} />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-charcoal text-cream/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-10 text-sm sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <Wordmark tone="light" className="text-4xl" />
            <p className="font-semibold tracking-[0.2em] text-cream uppercase">{site.tagline}</p>
          </div>
          <p className="max-w-sm text-pretty">Pedidos por WhatsApp o desde la web. Entregamos con camión propio.</p>
        </div>
      </footer>

      <WhatsappFab phone={phone} />
      <OrderToaster />
    </div>
  );
}
