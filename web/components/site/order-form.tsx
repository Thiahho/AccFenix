"use client";

import { useState } from "react";
import { Controller, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PublicSettings } from "@/lib/api";
import { orderSchema, type OrderForm } from "@/lib/order";
import { provincias } from "@/lib/provincias";
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
    formState: { errors },
  } = useForm<OrderForm>({
    resolver: zodResolver(orderSchema),
    defaultValues: { zona: "buenos-aires", nombre: "", telefono: "", localidad: "", direccion: "", comentarios: "" },
    shouldUnregister: true,
  });
  const zona = watch("zona");
  const e = errors as AnyErrors;
  const canSend = settings.whatsappNumber.length > 0;

  const fieldProps = (name: string) => ({
    id: name,
    "aria-invalid": e[name] ? true : undefined,
    "aria-describedby": e[name] ? `${name}-error` : undefined,
  });

  function onSubmit(form: OrderForm) {
    const text = buildOrderMessage(items, form, settings.wholesaleThreshold);
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
              <RadioGroup value={field.value} onValueChange={field.onChange} className="grid grid-cols-2 gap-2">
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
              <Input autoComplete="address-level2" {...fieldProps("localidad")} {...register("localidad")} />
            </Field>
            <Field id="direccion" label="Dirección" error={e.direccion?.message}>
              <Input autoComplete="street-address" {...fieldProps("direccion")} {...register("direccion")} />
            </Field>
          </>
        ) : (
          <>
            <Field id="provincia" label="Provincia" error={e.provincia?.message}>
              <Controller
                control={control}
                name="provincia"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full" {...fieldProps("provincia")}>
                      <SelectValue placeholder="Elegí tu provincia" />
                    </SelectTrigger>
                    <SelectContent>
                      {provincias.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
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
