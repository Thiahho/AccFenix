import Link from "next/link";
import { WhatsappFab } from "@/components/home/whatsapp-fab";
import { MotionProvider } from "@/components/motion/motion-provider";
import { Wordmark } from "@/components/site/wordmark";
import { OrderToaster } from "@/components/site/order-toast";
import { posterClass } from "@/components/site/poster-fonts";
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
      <div className={`${posterClass} flex min-h-dvh flex-col`}>
        <SiteHeader categories={categories} />

        <main className="flex-1">{children}</main>

        <footer className="poster-ink border-t-[3px] border-espresso">
          <div className="overflow-hidden border-b-2 border-cream px-4 pt-6 pb-3 sm:px-6 lg:px-8">
            <Wordmark tone="light" className="poster-footer-name block whitespace-nowrap" />
          </div>
          <div className="flex flex-col gap-4 px-4 py-6 text-sm sm:flex-row sm:items-end sm:justify-between sm:px-6 lg:px-8">
            <div className="flex flex-col gap-2">
              <p className="poster-label text-latte">{site.tagline}</p>
              <p className="max-w-sm text-pretty text-cream">Pedidos por WhatsApp o desde la web. Entregamos con camión propio.</p>
            </div>
            <Link
              href="/admin/login"
              prefetch={false}
              rel="nofollow"
              className="inline-flex min-h-11 items-center text-xs text-cream underline-offset-4 hover:underline"
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
