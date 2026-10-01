"use client";

import { Button } from "@/components/ui/button";

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-xl rounded-xl border bg-background p-8">
      <h1 className="text-xl font-semibold">Algo salió mal</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message || "No se pudo conectar con la API."}</p>
      <Button className="mt-6" onClick={reset}>Reintentar</Button>
    </div>
  );
}
