"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveSettings } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminSettings } from "@/lib/admin/types";

export function SettingsForm({ settings }: { settings: AdminSettings }) {
  const [pending, startTransition] = useTransition();
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber);
  const [wholesaleThreshold, setWholesaleThreshold] = useState(settings.wholesaleThreshold);

  return (
    <form
      className="space-y-5 rounded-xl border bg-background p-5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await saveSettings({ whatsappNumber, wholesaleThreshold });
          if (res.ok) toast.success("Configuración guardada");
          else toast.error(res.error);
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="wa">Número de WhatsApp para pedidos</Label>
        <Input id="wa" type="tel" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="5491122334455" required aria-describedby="wa-help" />
        <p id="wa-help" className="text-xs text-muted-foreground">Con código de país y área, sin el 0 ni el 15. Ej.: 54 9 11 2233 4455.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="threshold">Umbral mayorista (unidades)</Label>
        <Input id="threshold" type="number" min={1} className="w-40" value={wholesaleThreshold} onChange={(e) => setWholesaleThreshold(Number(e.target.value) || 0)} required aria-describedby="threshold-help" />
        <p id="threshold-help" className="text-xs text-muted-foreground">Desde esta cantidad total de unidades, el pedido se marca como mayorista en el mensaje.</p>
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</Button>
    </form>
  );
}
