import { CatalogGrid } from "@/components/home/catalog-grid";
import { CurtainIntro } from "@/components/home/curtain-intro";
import { Faq } from "@/components/home/faq";
import { Hero } from "@/components/home/hero";
import { HowWeWork } from "@/components/home/how-we-work";
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
      <CurtainIntro>
        <Hero phone={settings.whatsappNumber} />
      </CurtainIntro>
      <CatalogGrid phone={settings.whatsappNumber} />
      <HowWeWork />
      <ProjectsGallery />
      <Professionals phone={settings.whatsappNumber} threshold={settings.wholesaleThreshold} />
      <Faq />
    </>
  );
}
