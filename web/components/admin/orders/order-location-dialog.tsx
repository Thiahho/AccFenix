"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLinkIcon, Loader2Icon, MapPinIcon, PencilIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { updateOrderLocation } from "@/app/admin/(panel)/pedidos/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mapsLinkPoint, type LocationField } from "@/lib/admin/orders";
import { fetchUbicacion, type Coords, type GeoError } from "@/lib/geo";
import { mapsLink } from "@/lib/maps-url";

type Location = { locality: string | null; address: string | null; latitude: number | null; longitude: number | null };
type Props = { orderId: number; location: Location };

const linkErrorText: Record<GeoError, string> = {
  "link-invalido": "Ese link no parece de Google Maps. Copialo desde Compartir → Copiar vínculo.",
  "sin-coordenadas": "Ese link no trae la ubicación. Probá con otro o abrí el lugar en Maps y copiá el link de nuevo.",
  "sin-servicio": "No pudimos leer el link en este momento. Probá de nuevo en un rato.",
};

export function OrderLocationDialog({ trigger, ...props }: Props & { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="h-11 md:h-7">
            <PencilIcon aria-hidden /> Editar ubicación
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {/* Mounted on every open, so the form starts from the current location. */}
        <OrderLocationForm {...props} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function OrderLocationForm({ orderId, location, onSaved }: Props & { onSaved: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [locality, setLocality] = useState(location.locality ?? "");
  const [address, setAddress] = useState(location.address ?? "");
  const [point, setPoint] = useState<Coords | null>(
    location.latitude != null && location.longitude != null ? { lat: location.latitude, lng: location.longitude } : null,
  );
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<LocationField, string>>>({});

  async function readLink() {
    setLinkError(null);
    const result = mapsLinkPoint(link);
    if ("error" in result) return setLinkError(linkErrorText[result.error]);
    if ("coords" in result) return applyPoint(result.coords);
    // Short links are followed on the server, through the same endpoint the public order form uses.
    setResolving(true);
    const resolved = await fetchUbicacion(link.trim());
    setResolving(false);
    if ("error" in resolved) return setLinkError(linkErrorText[resolved.error]);
    applyPoint({ lat: resolved.lugar.lat, lng: resolved.lugar.lng });
  }

  function applyPoint(coords: Coords) {
    setPoint(coords);
    setLink("");
    setErrors((e) => ({ ...e, point: undefined }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateOrderLocation(orderId, {
        locality,
        address,
        latitude: point?.lat ?? null,
        longitude: point?.lng ?? null,
      });
      if (!res.ok) {
        setErrors(res.fieldErrors);
        return void toast.error(res.error);
      }
      toast.success("Ubicación actualizada");
      onSaved();
      router.refresh();
    });
  }

  const busy = pending || resolving;
  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Editar ubicación</DialogTitle>
        <DialogDescription>Se usa en &quot;Ver en Maps&quot; y al armar el recorrido.</DialogDescription>
      </DialogHeader>

      <div className="space-y-1.5">
        <Label htmlFor="loc-locality">Localidad</Label>
        <Input
          id="loc-locality"
          value={locality}
          onChange={(e) => setLocality(e.target.value)}
          required
          maxLength={120}
          aria-invalid={errors.locality ? true : undefined}
          aria-describedby={errors.locality ? "loc-locality-error" : undefined}
        />
        {errors.locality && <p id="loc-locality-error" className="text-sm text-destructive">{errors.locality}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="loc-address">Dirección</Label>
        <Input
          id="loc-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          maxLength={200}
          aria-invalid={errors.address ? true : undefined}
          aria-describedby={errors.address ? "loc-address-error" : undefined}
        />
        {errors.address && <p id="loc-address-error" className="text-sm text-destructive">{errors.address}</p>}
      </div>

      <div className="space-y-2 rounded-lg border p-3">
        <p className="text-sm font-medium">Punto en el mapa</p>
        {point ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1 tabular-nums">
              <MapPinIcon aria-hidden className="size-3.5 text-brand" />
              {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
            </span>
            <a
              href={mapsLink(point)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1 font-medium text-brand hover:underline md:min-h-7"
            >
              Ver en Maps <ExternalLinkIcon aria-hidden className="size-3.5" />
            </a>
            <Button type="button" variant="ghost" size="sm" className="h-11 text-destructive hover:text-destructive md:h-7" onClick={() => setPoint(null)}>
              <XIcon aria-hidden /> Quitar punto
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin punto: Maps busca por dirección y localidad.</p>
        )}
        {errors.point && <p className="text-sm text-destructive">{errors.point}</p>}

        <div className="space-y-1.5">
          <Label htmlFor="loc-link">Link de Google Maps</Label>
          <div className="flex gap-2">
            <Input
              id="loc-link"
              type="url"
              inputMode="url"
              placeholder="https://maps.app.goo.gl/…"
              autoComplete="off"
              value={link}
              disabled={resolving}
              aria-invalid={linkError ? true : undefined}
              aria-describedby={linkError ? "loc-link-error" : "loc-link-help"}
              onChange={(e) => {
                setLink(e.target.value);
                setLinkError(null);
              }}
              onKeyDown={(e) => {
                // Enter reads the link instead of saving the form.
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (link.trim()) void readLink();
                }
              }}
            />
            <Button type="button" variant="outline" disabled={resolving || !link.trim()} onClick={() => void readLink()}>
              {resolving && <Loader2Icon aria-hidden className="animate-spin" />}
              {resolving ? "Leyendo…" : point ? "Cambiar punto" : "Usar link"}
            </Button>
          </div>
          {linkError ? (
            <p id="loc-link-error" className="text-sm text-destructive">{linkError}</p>
          ) : (
            <p id="loc-link-help" className="text-xs text-muted-foreground">En Google Maps tocá Compartir → Copiar vínculo y pegalo acá.</p>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={busy || !locality.trim() || !address.trim()}>{pending ? "Guardando…" : "Guardar"}</Button>
      </DialogFooter>
    </form>
  );
}
