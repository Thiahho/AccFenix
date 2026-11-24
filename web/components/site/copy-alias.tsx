"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type CopyState = "idle" | "copied" | "failed";

/** Copies the Mercado Pago alias; when the clipboard is unavailable the alias stays visible to copy by hand. */
export function CopyAlias({ alias }: { alias: string }) {
  const [state, setState] = useState<CopyState>("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(alias);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <span className="select-all break-all font-mono text-lg font-semibold tracking-wide">{alias}</span>
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={copy} aria-label={`Copiar alias ${alias}`}>
        {state === "copied" ? <CheckIcon aria-hidden className="size-4" /> : <CopyIcon aria-hidden className="size-4" />}
        {state === "copied" ? "Copiado" : "Copiar"}
      </Button>
      <span role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {state === "failed" ? "No pudimos copiarlo. Seleccioná el alias y copialo a mano." : ""}
      </span>
    </div>
  );
}
