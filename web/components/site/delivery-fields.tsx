"use client";

import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Field, fieldA11y } from "@/components/site/form-field";
import type { OrderForm } from "@/lib/order";

type Props = { form: UseFormReturn<OrderForm>; errors: Partial<Record<string, string>> };

/** Delivery step: envío a domicilio en Moreno o retiro en el local, con horario en ambos casos. */
export function DeliveryFields({ form, errors: e }: Props) {
  const { control, register } = form;
  const entrega = useWatch({ control, name: "entrega" });
  const fieldProps = (name: string) => fieldA11y(name, e[name]);

  return (
    <>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">¿Cómo lo recibís?</legend>
        <Controller
          control={control}
          name="entrega"
          render={({ field }) => (
            <RadioGroup value={field.value ?? ""} onValueChange={field.onChange} className="grid grid-cols-2 gap-2">
              {[
                { value: "envio", label: "Envío en Moreno" },
                { value: "retiro", label: "Retiro en el local" },
              ].map((o) => (
                <Label
                  key={o.value}
                  htmlFor={`entrega-${o.value}`}
                  className="flex min-h-14 cursor-pointer items-center gap-2 border-2 border-espresso p-3 font-semibold leading-tight has-data-[state=checked]:bg-latte"
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

      {entrega && (
        <Field id="horario" label={entrega === "envio" ? "Horario de entrega" : "Horario para pasar a retirar"} error={e.horario}>
          <Input placeholder="Ej.: Hoy de 16 a 18 h" maxLength={60} {...fieldProps("horario")} {...register("horario")} />
        </Field>
      )}
    </>
  );
}
