"use client";

import { useImperativeHandle, useState } from "react";
import { ExternalLinkIcon, Loader2Icon, MapPinIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchUbicacion, type Coords, type GeoError, type LugarCaptado } from "@/lib/geo";
import { isMapsUrl, mapsLink } from "@/lib/maps-url";
import { provincias } from "@/lib/provincias";

export type MapsLinkCaptureHandle = { capture: (url: string) => void };
export type Provincia = (typeof provincias)[number];

type Props = {
  ref?: React.Ref<MapsLinkCaptureHandle>;
  onApply: (datos: { localidad: string; direccion: string; coords: Coords }) => void;
  onSwitchProvincia: (provincia: Provincia) => void;
};

const errorText: Record<GeoError, string> = {
  "link-invalido": "Ese link no parece de Google Maps. Copialo desde Compartir → Copiar vínculo.",
  "sin-coordenadas": "No pudimos leer la ubicación de ese link. Probá con otro o escribí la dirección.",
  "sin-servicio": "No pudimos consultar la ubicación en este momento. Escribí la dirección a mano.",
};

type Status = { step: "idle" } | { step: "loading" } | { step: "error"; error: GeoError } | { step: "found"; lugar: LugarCaptado };

/** Capta la ubicación desde un link de Google Maps y la muestra para confirmar o corregir antes de usarla. */
export function MapsLinkCapture({ ref, onApply, onSwitchProvincia }: Props) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>({ step: "idle" });
  const [localidad, setLocalidad] = useState("");
  const [direccion, setDireccion] = useState("");

  async function capture(link: string) {
    const text = link.trim();
    setOpen(true);
    setUrl(text);
    if (!isMapsUrl(text)) return setStatus({ step: "error", error: "link-invalido" });
    setStatus({ step: "loading" });
    const result = await fetchUbicacion(text);
    if ("error" in result) return setStatus({ step: "error", error: result.error });
    setLocalidad(result.lugar.localidad);
    setDireccion(result.lugar.direccion);
    setStatus({ step: "found", lugar: result.lugar });
  }
  useImperativeHandle(ref, () => ({ capture }));

  function reset() {
    setOpen(false);
    setUrl("");
    setStatus({ step: "idle" });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-brand hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:min-h-8"
      >
        <MapPinIcon aria-hidden className="size-4" /> Pegar link de Google Maps
      </button>
    );
  }

  if (status.step === "found") {
    const { lugar } = status;
    const otraProvincia = provincias.find((p) => lugar.provincia.startsWith(p));
    return (
      <div role="group" aria-labelledby="captura-titulo" className="space-y-3 rounded-lg border border-brand/30 bg-brand-soft/50 p-3">
        <div className="flex items-start justify-between gap-3">
          <p id="captura-titulo" className="text-sm font-semibold">Encontramos esta ubicación</p>
          <a
            href={mapsLink(lugar)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:underline"
          >
            Ver en Maps <ExternalLinkIcon aria-hidden className="size-3.5" />
          </a>
        </div>

        {lugar.enZona ? (
          <>
            <p className="text-sm text-muted-foreground">Revisá los datos y corregilos si hace falta antes de usarlos.</p>
            <div className="space-y-1.5">
              <Label htmlFor="captura-localidad">Localidad</Label>
              <Input id="captura-localidad" className="bg-background" value={localidad} onChange={(e) => setLocalidad(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="captura-direccion">Dirección</Label>
              <Input
                id="captura-direccion"
                className="bg-background"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                aria-describedby={lugar.tieneAltura ? undefined : "captura-altura"}
              />
              {!lugar.tieneAltura && (
                <p id="captura-altura" className="text-sm text-amber-800">
                  No pudimos leer la altura: completala.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="h-11 flex-1 md:h-9"
                disabled={!localidad.trim() || !direccion.trim()}
                onClick={() => {
                  onApply({ localidad: localidad.trim(), direccion: direccion.trim(), coords: { lat: lugar.lat, lng: lugar.lng } });
                  reset();
                }}
              >
                Usar estos datos
              </Button>
              <Button type="button" variant="outline" className="h-11 bg-background md:h-9" onClick={reset}>
                Cancelar
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Esa ubicación está en {lugar.provincia || "otra provincia"}, fuera de Buenos Aires. Para el interior coordinamos el envío por expreso.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {otraProvincia && (
                <Button
                  type="button"
                  className="h-11 flex-1 md:h-9"
                  onClick={() => {
                    onSwitchProvincia(otraProvincia);
                    reset();
                  }}
                >
                  Cambiar a Otra provincia
                </Button>
              )}
              <Button type="button" variant="outline" className="h-11 bg-background md:h-9" onClick={reset}>
                Cancelar
              </Button>
            </div>
          </>
        )}
        <p className="text-xs text-muted-foreground">Datos © OpenStreetMap</p>
      </div>
    );
  }

  const loading = status.step === "loading";
  return (
    <div className="space-y-1.5 rounded-lg border border-dashed p-3">
      <Label htmlFor="maps-link">Link de Google Maps</Label>
      <div className="flex gap-2">
        <Input
          id="maps-link"
          type="url"
          inputMode="url"
          placeholder="https://maps.app.goo.gl/…"
          autoComplete="off"
          value={url}
          disabled={loading}
          aria-invalid={status.step === "error" ? true : undefined}
          aria-describedby={status.step === "error" ? "maps-link-error" : "maps-link-ayuda"}
          onChange={(e) => {
            setUrl(e.target.value);
            if (status.step === "error") setStatus({ step: "idle" });
          }}
          onKeyDown={(e) => {
            // Enter busca la ubicación en vez de enviar el pedido.
            if (e.key === "Enter") {
              e.preventDefault();
              if (url.trim()) void capture(url);
            }
          }}
        />
        <Button type="button" className="h-11 md:h-8" disabled={loading || !url.trim()} onClick={() => void capture(url)}>
          {loading ? <Loader2Icon aria-hidden className="animate-spin" /> : null}
          {loading ? "Buscando…" : "Buscar"}
        </Button>
      </div>
      {status.step === "error" ? (
        <p id="maps-link-error" className="text-sm text-destructive">{errorText[status.error]}</p>
      ) : (
        <p id="maps-link-ayuda" className="text-xs text-muted-foreground">En Google Maps tocá Compartir → Copiar vínculo y pegalo acá.</p>
      )}
      <button type="button" onClick={reset} className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground md:min-h-8">
        Cancelar
      </button>
    </div>
  );
}
