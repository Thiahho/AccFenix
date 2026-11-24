"use client";

import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Field, fieldA11y } from "@/components/site/form-field";
import type { OrderForm } from "@/lib/order";
import { pickupTimeIn } from "@/lib/orders/pickup-time";

type Props = { form: UseFormReturn<OrderForm>; errors: Partial<Record<string, string>> };

const quickTimes = [
  { minutes: 30, label: "+30 min" },
  { minutes: 60, label: "+1 hora" },
  { minutes: 120, label: "+2 horas" },
];

/** Delivery step: envío a domicilio en Moreno o retiro en el local, con horario en ambos casos. */
export function DeliveryFields({ form, errors: e }: Props) {
  const { control, register, setValue, setError, clearErrors } = form;
  const entrega = useWatch({ control, name: "entrega" });
  const fieldProps = (name: string) => fieldA11y(name, e[name]);

  function chooseIn(minutes: number) {
    const time = pickupTimeIn(minutes, new Date());
    if (!time) return setError("horario", { type: "manual", message: "Ese horario ya sería mañana. Elegí una hora de hoy." });
    setValue("horario", time, { shouldDirty: true, shouldValidate: true });
  }

  return (
    <>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">¿Cómo lo recibís?</legend>
        <Controller
          control={control}
          name="entrega"
          render={({ field }) => (
            <RadioGroup
              value={field.value ?? ""}
              onValueChange={(value) => {
                field.onChange(value);
                // Delivery takes free text and pickup an hour, so a value never carries over.
                setValue("horario", "");
                clearErrors("horario");
              }}
              className="grid grid-cols-2 gap-2"
            >
              {[
                { value: "envio", label: "Envío en Moreno" },
                { value: "retiro", label: "Retiro en el local" },
              ].map((o) => (
                <Label
                  key={o.value}
                  htmlFor={`entrega-${o.value}`}
                  className="flex min-h-14 cursor-pointer items-center gap-2 border border-border p-3 font-semibold leading-tight has-data-[state=checked]:bg-latte"
                >
                  <RadioGroupItem id={`entrega-${o.value}`} value={o.value} />
                  {o.label}
                </Label>
              ))}
            </RadioGroup>
          )}
        />
        {e.entrega && (
          <p role="alert" className="text-sm text-destructive">
            {e.entrega}
          </p>
        )}
      </fieldset>

      {entrega === "envio" && (
        <Field id="direccion" label="Dirección en Moreno" error={e.direccion}>
          <Input placeholder="Calle y altura, piso o depto" maxLength={200} autoComplete="street-address" {...fieldProps("direccion")} {...register("direccion")} />
        </Field>
      )}

      {entrega === "envio" && (
        <Field id="horario" label="Horario de entrega" error={e.horario}>
          <Input placeholder="Ej.: Hoy de 16 a 18 h" maxLength={60} {...fieldProps("horario")} {...register("horario")} />
        </Field>
      )}

      {entrega === "retiro" && (
        <div className="space-y-2">
          <Field id="horario" label="Hora para pasar a retirar (hoy)" error={e.horario}>
            <Input type="time" step={300} className="text-lg tabular-nums [color-scheme:dark]" {...fieldProps("horario")} {...register("horario")} />
          </Field>
          <div role="group" aria-label="Elegir una hora rápida" className="grid grid-cols-3 gap-2">
            {quickTimes.map((option) => (
              <button
                key={option.minutes}
                type="button"
                onClick={() => chooseIn(option.minutes)}
                aria-label={`Retirar dentro de ${option.label.slice(1)}`}
                className="min-h-11 rounded-full border border-border px-2 text-[13px] font-semibold whitespace-nowrap transition-colors hover:bg-oat"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
