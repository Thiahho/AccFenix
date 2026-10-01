"use client";

import { useRef, useState } from "react";
import { Controller, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPinIcon, MessageCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { MapsLinkCapture, type MapsLinkCaptureHandle } from "@/components/site/maps-link-capture";
import { ProvinciaPicker } from "@/components/site/provincia-picker";
import { SuggestInput } from "@/components/site/suggest-input";
import type { PublicSettings } from "@/lib/api";
import { alturaEscrita, fetchDirecciones, fetchLocalidades, type Coords, type DireccionSuggestion, type LocalidadSuggestion } from "@/lib/geo";
import { isMapsUrl, mapsLink } from "@/lib/maps-url";
import { orderSchema, type OrderForm } from "@/lib/order";
import { buildOrderMessage, whatsappUrl } from "@/lib/whatsapp";
import { useCart, type CartItem } from "@/stores/cart";

type AnyErrors = FieldErrors<Record<string, string>>;

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p id={`${id}-error`} className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function OrderFormCard({ items, settings }: { items: CartItem[]; settings: PublicSettings }) {
  const clear = useCart((s) => s.clear);
  const [sent, setSent] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<OrderForm>({
    resolver: zodResolver(orderSchema),
    defaultValues: { zona: "buenos-aires", nombre: "", telefono: "", localidad: "", direccion: "", comentarios: "" },
    shouldUnregister: true,
  });
  const zona = watch("zona");
  // Centro de la localidad elegida, para acercar las sugerencias de dirección.
  const [near, setNear] = useState<Coords | null>(null);
  // Punto exacto captado, junto con los textos con los que se confirmó.
  const [ubicacion, setUbicacion] = useState<{ coords: Coords; localidad: string; direccion: string } | null>(null);
  const captureRef = useRef<MapsLinkCaptureHandle>(null);
  const e = errors as AnyErrors;
  const canSend = settings.whatsappNumber.length > 0;

  const fieldProps = (name: string) => ({
    id: name,
    "aria-invalid": e[name] ? true : undefined,
    "aria-describedby": e[name] ? `${name}-error` : undefined,
  });

  function onSubmit(form: OrderForm) {
    const order = form.zona === "buenos-aires" && ubicacion ? { ...form, ubicacion: ubicacion.coords } : form;
    const text = buildOrderMessage(items, order, settings.wholesaleThreshold);
    window.open(whatsappUrl(settings.whatsappNumber, text), "_blank", "noopener,noreferrer");
    setSent(true);
  }

  if (sent) {
    return (
      <aside className="h-fit rounded-xl border bg-brand-soft/50 p-6">
        <h2 className="text-lg font-semibold">¿Se abrió WhatsApp?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Enviá el mensaje desde WhatsApp y te respondemos con la cotización. Si ya lo enviaste, podés vaciar el pedido.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={clear}>Ya lo envié, vaciar pedido</Button>
          <Button variant="outline" onClick={() => setSent(false)}>Volver a los datos</Button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="h-fit rounded-xl border p-6 lg:sticky lg:top-24">
      <h2 className="text-lg font-semibold">Tus datos</h2>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 space-y-4">
        <Field id="nombre" label="Nombre y apellido" error={e.nombre?.message}>
          <Input autoComplete="name" {...fieldProps("nombre")} {...register("nombre")} />
        </Field>
        <Field id="telefono" label="Teléfono" error={e.telefono?.message}>
          <Input type="tel" autoComplete="tel" {...fieldProps("telefono")} {...register("telefono")} />
        </Field>

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

        {zona === "buenos-aires" ? (
          <>
            <Field id="localidad" label="Localidad" error={e.localidad?.message}>
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
            <Field id="direccion" label="Dirección" error={e.direccion?.message}>
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
        ) : (
          <>
            <Field id="provincia" label="Provincia" error={e.provincia?.message}>
              <Controller
                control={control}
                name="provincia"
                render={({ field }) => <ProvinciaPicker value={field.value} onChange={field.onChange} {...fieldProps("provincia")} />}
              />
            </Field>
            <Field id="expreso" label="Expreso de tu preferencia" error={e.expreso?.message}>
              <Input placeholder="Ej.: Vía Cargo, Andreani…" {...fieldProps("expreso")} {...register("expreso")} />
            </Field>
          </>
        )}

        <Field id="comentarios" label="Comentarios (opcional)" error={e.comentarios?.message}>
          <Textarea rows={3} {...fieldProps("comentarios")} {...register("comentarios")} />
        </Field>

        <Button type="submit" size="lg" className="w-full" disabled={!canSend}>
          <MessageCircleIcon aria-hidden /> Enviar pedido por WhatsApp
        </Button>
        {!canSend && <p className="text-sm text-destructive">El envío por WhatsApp no está disponible en este momento.</p>}
        <p className="text-xs text-muted-foreground">
          No calculamos precios ni envío online: te contactamos para cotizar y coordinar la entrega.
        </p>
      </form>
    </aside>
  );
}
