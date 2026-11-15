import Link from "next/link";
import { WhatsappFab } from "@/components/home/whatsapp-fab";
import { MotionProvider } from "@/components/motion/motion-provider";
import { Wordmark } from "@/components/site/wordmark";
import { OrderToaster } from "@/components/site/order-toast";
import { SiteHeader } from "@/components/site/site-header";
import { api, type Category } from "@/lib/api";
import { site } from "@/lib/site";

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
    <MotionProvider>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader categories={categories} />

        <main className="flex-1">{children}</main>

        <footer className="bg-charcoal text-cream/80">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-10 text-sm sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-1">
              <Wordmark tone="light" className="text-4xl" />
              <p className="font-semibold tracking-[0.2em] text-cream uppercase">{site.tagline}</p>
            </div>
            <p className="max-w-sm text-pretty">Pedidos por WhatsApp o desde la web. Entregamos con camión propio.</p>
          </div>
          <div className="mx-auto flex max-w-6xl justify-end px-4 pb-6">
            <Link
              href="/admin/login"
              prefetch={false}
              rel="nofollow"
              className="text-xs text-cream/40 transition-colors hover:text-cream/80"
            >
              Acceso administración
            </Link>
          </div>
        </footer>

        <WhatsappFab phone={phone} />
        <OrderToaster />
      </div>
    </MotionProvider>
  );
}
