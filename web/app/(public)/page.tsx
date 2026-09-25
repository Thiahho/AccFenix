import { CatalogGrid } from "@/components/home/catalog-grid";
import { Faq } from "@/components/home/faq";
import { Hero } from "@/components/home/hero";
import { Professionals } from "@/components/home/professionals";
import { ProjectsGallery } from "@/components/home/projects-gallery";
import { api, type PublicSettings } from "@/lib/api";

async function loadSettings(): Promise<PublicSettings> {
  try {
    return await api.settings();
  } catch {
    return { whatsappNumber: "", wholesaleThreshold: 0 }; // Sin API, la home se muestra sin botones de WhatsApp.
  }
}

export default async function HomePage() {
  const settings = await loadSettings();

  return (
    <>
      <Hero phone={settings.whatsappNumber} />
      <ProjectsGallery />
      <CatalogGrid phone={settings.whatsappNumber} />
      <Professionals phone={settings.whatsappNumber} threshold={settings.wholesaleThreshold} />
      <Faq />
    </>
  );
}
