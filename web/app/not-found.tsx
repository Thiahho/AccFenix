import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Página no encontrada", robots: { index: false } };

// Rendered for URLs that match no route group, so it cannot rely on the public layout (header, footer).
export default function RootNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-4 py-24 text-center">
      <Link href="/" className="text-lg font-bold text-brand">
        {site.name}
      </Link>
      <p className="eyebrow mt-10 text-yolk">404</p>
      <h1 className="title-display mt-3 text-4xl sm:text-5xl">No encontramos esta página</h1>
      <p className="mt-3 text-muted-foreground">Revisá la dirección o volvé al inicio para ver el catálogo.</p>
      <Button asChild className="mt-8">
        <Link href="/">Volver al inicio</Link>
      </Button>
    </main>
  );
}
