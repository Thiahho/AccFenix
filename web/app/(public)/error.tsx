"use client";

import { PosterHead } from "@/components/site/poster-head";
import { Button } from "@/components/ui/button";

export default function PublicError({ reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <PosterHead label="Error" title="No pudimos cargar el catálogo">
        Probá de nuevo en unos segundos. Tu pedido sigue guardado en este navegador.
      </PosterHead>
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <Button className="w-full sm:w-auto" onClick={reset}>Reintentar</Button>
      </div>
    </>
  );
}
