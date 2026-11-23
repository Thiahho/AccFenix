import type { Metadata } from "next";
import Link from "next/link";
import { PosterHead } from "@/components/site/poster-head";
import { posterClass } from "@/components/site/poster-fonts";
import { Wordmark } from "@/components/site/wordmark";

export const metadata: Metadata = { title: "Página no encontrada", robots: { index: false } };

// Rendered for URLs that match no route group, so it cannot rely on the public layout (header, footer).
export default function RootNotFound() {
  return (
    <main className={`${posterClass} flex min-h-dvh flex-col`}>
      <Link href="/" className="poster-focus-inset flex h-16 items-center border-b-[3px] border-espresso px-4 sm:px-6 lg:px-8">
        <Wordmark className="text-3xl" />
      </Link>
      <PosterHead label="404" title="No encontramos esta página">
        Revisá la dirección o volvé al inicio para ver el catálogo.
      </PosterHead>
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/" className="poster-cta w-full bg-espresso text-ivory hover:bg-roast sm:w-fit">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
