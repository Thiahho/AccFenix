import Image from "next/image";
import Link from "next/link";
import { WhatsappFab } from "@/components/home/whatsapp-fab";
import { MobileMenu } from "@/components/site/mobile-menu";
import { CartButton } from "@/components/site/cart-button";
import { OrderToaster } from "@/components/site/order-toast";
import { api, type Category } from "@/lib/api";
import { site } from "@/lib/site";

const sections = [
  { href: "/#catalogo", label: "Catálogo" },
  { href: "/#proyectos", label: "Proyectos" },
  { href: "/#profesionales", label: "Profesionales" },
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
          <Link href="/" aria-label={`${site.name} — inicio`} className="flex min-h-11 items-center gap-2.5">
            <Image src="/logo-solo.png" alt="" width={34} height={40} priority className="h-9 w-auto" />
            <Image src="/nombre.png" alt="Accesorios Fenix — barrales de madera" width={160} height={26} priority className="hidden h-6 w-auto sm:block" />
          </Link>
          <nav aria-label="Secciones" className="hidden flex-1 items-center gap-5 text-sm md:flex">
            {sections.map((s) => (
              <Link key={s.href} href={s.href} className="text-muted-foreground transition-colors hover:text-foreground">
                {s.label}
              </Link>
            ))}
            {categories.length > 0 && <span aria-hidden className="h-4 w-px bg-border" />}
            {categories.map((c) => (
              <Link key={c.id} href={`/catalogo/${c.slug}`} className="text-muted-foreground transition-colors hover:text-foreground">
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

      <footer className="bg-navy text-ivory/75">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 border-t border-ivory/25 px-4 py-8 text-sm sm:flex-row sm:items-baseline sm:justify-between">
          <p>
            <span className="font-serif text-xl text-ivory">{site.name}</span> · {site.tagline}
          </p>
          <p>Precios y envío se coordinan por WhatsApp al recibir tu pedido.</p>
        </div>
      </footer>

      <WhatsappFab phone={phone} />
      <OrderToaster />
    </div>
  );
}
