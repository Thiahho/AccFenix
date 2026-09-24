"use client";

import { Button } from "@/components/ui/button";

export default function PublicError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">No pudimos cargar el catálogo</h1>
      <p className="mt-3 text-muted-foreground">Probá de nuevo en unos segundos. Tu pedido sigue guardado en este navegador.</p>
      <Button className="mt-8" onClick={reset}>Reintentar</Button>
    </div>
  );
}
