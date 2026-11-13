"use client";

import { useRef } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { MapPinIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Field, fieldA11y } from "@/components/site/form-field";
import { MapsLinkCapture, type MapsLinkCaptureHandle } from "@/components/site/maps-link-capture";
import { ProvinciaPicker } from "@/components/site/provincia-picker";
import { SuggestInput } from "@/components/site/suggest-input";
import { alturaEscrita, fetchDirecciones, fetchLocalidades, type Coords, type DireccionSuggestion, type LocalidadSuggestion } from "@/lib/geo";
import { isMapsUrl, mapsLink } from "@/lib/maps-url";
import type { OrderForm } from "@/lib/order";

/** Exact point captured for the address, with the texts it was confirmed with. */
export type CapturedLocation = { coords: Coords; localidad: string; direccion: string };

type Props = {
  form: UseFormReturn<OrderForm>;
  errors: Partial<Record<string, string>>;
  /** Centre of the chosen locality, to bias address suggestions. */
  near: Coords | null;
  onNearChange: (near: Coords | null) => void;
  ubicacion: CapturedLocation | null;
  onUbicacionChange: (ubicacion: CapturedLocation | null) => void;
};

/** Delivery step: zone, then locality and address (with Maps capture) for Buenos Aires or province and carrier. */
export function DeliveryFields({ form, errors: e, near, onNearChange: setNear, ubicacion, onUbicacionChange: setUbicacion }: Props) {
  const { control, register, watch, setValue, getValues } = form;
  const zona = watch("zona");
  const captureRef = useRef<MapsLinkCaptureHandle>(null);
  const fieldProps = (name: string) => fieldA11y(name, e[name]);

  return (
    <>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">¿Dónde recibís el pedido?</legend>
        <Controller
          control={control}
          name="zona"
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                setUbicacion(null);
                setNear(null);
              }}
              className="grid grid-cols-2 gap-2"
            >
              {[
                { value: "buenos-aires", label: "Buenos Aires" },
                { value: "otra-provincia", label: "Otra provincia" },
              ].map((o) => (
                <Label
                  key={o.value}
                  htmlFor={`zona-${o.value}`}
                  className="flex cursor-pointer items-center gap-2 rounded-md border p-3 font-normal has-data-[state=checked]:border-brand has-data-[state=checked]:bg-brand-soft"
                >
                  <RadioGroupItem id={`zona-${o.value}`} value={o.value} />
                  {o.label}
                </Label>
              ))}
            </RadioGroup>
          )}
        />
      </fieldset>

      {zona === "otra-provincia" ? (
        <>
          <Field id="provincia" label="Provincia" error={e.provincia}>
            <Controller
              control={control}
              name="provincia"
              render={({ field }) => <ProvinciaPicker value={field.value} onChange={field.onChange} {...fieldProps("provincia")} />}
            />
          </Field>
          <Field id="expreso" label="Expreso de tu preferencia" error={e.expreso}>
            <Input placeholder="Ej.: Vía Cargo, Andreani…" {...fieldProps("expreso")} {...register("expreso")} />
          </Field>
        </>
      ) : (
        <>
          <Field id="localidad" label="Localidad" error={e.localidad}>
            <Controller
              control={control}
              name="localidad"
              render={({ field }) => (
                <SuggestInput<LocalidadSuggestion>
                  {...fieldProps("localidad")}
                  ref={field.ref}
                  name={field.name}
                  onBlur={field.onBlur}
                  value={field.value ?? ""}
                  minChars={2}
                  search={fetchLocalidades}
                  onValueChange={(text) => {
                    field.onChange(text);
                    setNear(null);
                    if (ubicacion && text !== ubicacion.localidad) setUbicacion(null);
                  }}
                  onPick={(l) => {
                    field.onChange(l.nombre);
                    setNear({ lat: l.lat, lng: l.lng });
                    if (ubicacion && l.nombre !== ubicacion.localidad) setUbicacion(null);
                  }}
                  itemKey={(l) => `${l.nombre}|${l.partido}|${l.provincia}`}
                  renderItem={(l) => (
                    <>
                      <span>{l.nombre}</span>
                      <span className="text-xs text-muted-foreground">
                        {l.provincia === "Buenos Aires" ? `Partido de ${l.partido}` : ["CABA", l.partido].filter(Boolean).join(" · ")}
                      </span>
                    </>
                  )}
                />
              )}
            />
          </Field>
          <Field id="direccion" label="Dirección" error={e.direccion}>
            <Controller
              control={control}
              name="direccion"
              render={({ field }) => (
                <SuggestInput<DireccionSuggestion>
                  {...fieldProps("direccion")}
                  ref={field.ref}
                  name={field.name}
                  onBlur={field.onBlur}
                  value={field.value ?? ""}
                  placeholder="Calle y altura"
                  search={(q, signal) => fetchDirecciones(q, near, signal)}
                  onValueChange={(text) => {
                    field.onChange(text);
                    // Agregar piso o depto al final conserva el punto; reescribir la dirección lo descarta.
                    if (ubicacion && !text.startsWith(ubicacion.direccion)) setUbicacion(null);
                  }}
                  onPick={(d) => {
                    const altura = d.altura ?? alturaEscrita(field.value ?? "", d.calle);
                    const direccion = altura ? `${d.calle} ${altura}` : d.calle;
                    field.onChange(direccion);
                    if (!getValues("localidad")?.trim() && d.localidad) setValue("localidad", d.localidad, { shouldValidate: true });
                    // Solo se adjunta el punto cuando corresponde a una puerta; el de una calle entera sería engañoso.
                    setUbicacion(d.exacta ? { coords: { lat: d.lat, lng: d.lng }, localidad: getValues("localidad") ?? "", direccion } : null);
                  }}
                  onPaste={(ev) => {
                    const text = ev.clipboardData.getData("text");
                    if (isMapsUrl(text)) {
                      ev.preventDefault();
                      captureRef.current?.capture(text);
                    }
                  }}
                  itemKey={(d) => `${d.calle}|${d.altura ?? ""}|${d.localidad}|${d.partido}`}
                  renderItem={(d) => (
                    <>
                      <span>{d.altura ? `${d.calle} ${d.altura}` : d.calle}</span>
                      <span className="text-xs text-muted-foreground">{[d.localidad, d.partido].filter(Boolean).join(" · ")}</span>
                    </>
                  )}
                />
              )}
            />
          </Field>

          {ubicacion && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-brand-soft px-3 py-2 text-sm">
              <span className="inline-flex items-center gap-1.5 font-medium text-brand">
                <MapPinIcon aria-hidden className="size-4" /> Ubicación captada
              </span>
              <a href={mapsLink(ubicacion.coords)} target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline-offset-2 hover:underline">
                Ver en Maps
              </a>
              <button type="button" onClick={() => setUbicacion(null)} className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                Quitar
              </button>
            </p>
          )}

          <MapsLinkCapture
            ref={captureRef}
            onApply={({ localidad, direccion, coords }) => {
              setValue("localidad", localidad, { shouldValidate: true, shouldDirty: true });
              setValue("direccion", direccion, { shouldValidate: true, shouldDirty: true });
              setNear(coords);
              setUbicacion({ coords, localidad, direccion });
            }}
            onSwitchProvincia={(provincia) => {
              setUbicacion(null);
              setValue("zona", "otra-provincia");
              // El campo Provincia recién existe después de renderizar la otra zona.
              setTimeout(() => setValue("provincia", provincia, { shouldValidate: true }));
            }}
          />
        </>
      )}
    </>
  );
}
