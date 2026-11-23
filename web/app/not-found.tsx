import type { Metadata } from "next";
import Link from "next/link";
import { CupSodaIcon } from "lucide-react";
import { MenuPill } from "@/components/site/menu-card";
import { posterClass } from "@/components/site/poster-fonts";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Página no encontrada", robots: { index: false } };

// Rendered for URLs that match no route group, so it cannot rely on the public layout (header, footer).
export default function RootNotFound() {
  return (
    <main className={`${posterClass} mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-4 py-24 text-center`}>
      <Link href="/" className="text-lg font-bold text-brand">
        {site.name}
      </Link>
      <MenuPill icon={CupSodaIcon} tone="caramel" className="mt-10">404</MenuPill>
      <h1 className="title-display mt-4 text-4xl sm:text-5xl">No encontramos esta página</h1>
      <p className="mt-3 text-muted-foreground">Revisá la dirección o volvé al inicio para ver el catálogo.</p>
      <Button asChild className="mt-8 rounded-full px-5">
        <Link href="/">Volver al inicio</Link>
      </Button>
    </main>
  );
}
