"use client";

import { useMemo, useRef, useState } from "react";
import { useForm, useWatch, type FieldErrors, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckoutProgress, CheckoutStep } from "@/components/site/checkout-step";
import { DeliveryFields } from "@/components/site/delivery-fields";
import { Field, fieldA11y } from "@/components/site/form-field";
import { submitOrder } from "@/app/actions/orders";
import { orderSchema, type OrderForm } from "@/lib/order";
import { isPastPickupTime, PICKUP_PAST_MESSAGE, pickupSlot } from "@/lib/orders/pickup-time";
import { unavailableResult, type SubmitOrderFailure } from "@/lib/orders/response";
import { PHONE_MAX_LENGTH } from "@/lib/phone";
import { firstOpenStep, invalidSteps, orderSteps, stepFields, stepOfField, stepStatus, type StepId } from "@/lib/orders/steps";
import { cartTotals, formatArs } from "@/lib/pricing";
import { unitsLabel } from "@/lib/qty";
import { QtyStepper } from "@/components/site/qty-stepper";
import { cartLineKey, MAX_QTY, totalUnits, useCart, type CartItem } from "@/stores/cart";

const stepTitles: Record<StepId, string> = {
  contacto: "¿Cómo te llamás?",
  entrega: "¿Cómo lo recibís?",
  revision: "Revisá y enviá",
};

type Values = Partial<Record<string, unknown>>;
const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function summaryOf(step: StepId, v: Values): string {
  switch (step) {
    case "contacto":
      return [text(v.nombre), text(v.telefono)].filter(Boolean).join(" · ");
    case "entrega":
      return v.entrega === "envio"
        ? [text(v.direccion), text(v.horario)].filter(Boolean).join(" · ")
        : [text(v.entrega) && "Retiro en el local", pickupSlot(text(v.horario))].filter(Boolean).join(" · ");
    case "revision":
      return "";
  }
}

/**
 * Step-by-step checkout over one react-hook-form instance: contact, delivery, then review and send. Each step validates its own fields (`trigger`) and unlocks the next; done steps collapse to an editable
 * summary. The order is stored through the server action before WhatsApp opens.
 */
export function OrderFormCard({ items }: { items: CartItem[] }) {
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [failure, setFailure] = useState<SubmitOrderFailure | null>(null);
  const form = useForm<OrderForm>({
    resolver: zodResolver(orderSchema),
    defaultValues: { nombre: "", telefono: "", direccion: "", horario: "", comentarios: "" },
    // Errors show once a field is left, so a disabled "Continuar" never hides why.
    mode: "onTouched",
    // Collapsed steps unmount their fields; their values must survive.
    shouldUnregister: false,
  });
  const { control, register, handleSubmit, getValues, setError, trigger, formState } = form;
  const values = useWatch({ control }) as Values;

  const [confirmed, setConfirmed] = useState<ReadonlySet<StepId>>(() => new Set());
  const [active, setActive] = useState(0);
  // Steps only steal focus after the visitor starts moving through them.
  const [moved, setMoved] = useState(false);
  const invalid = useMemo(() => invalidSteps(values), [values]);
  const open = firstOpenStep(confirmed, invalid);

  const errors = Object.fromEntries(
    Object.entries(formState.errors as FieldErrors<Record<string, string>>).map(([k, v]) => [k, v?.message]),
  ) as Partial<Record<string, string>>;

  function goTo(index: number) {
    setMoved(true);
    setActive(index);
  }

  function rejectPastPickup() {
    const { entrega, horario } = getValues();
    if (entrega !== "retiro" || !isPastPickupTime(horario, new Date())) return false;
    setError("horario", { type: "manual", message: PICKUP_PAST_MESSAGE }, { shouldFocus: true });
    return true;
  }

  async function confirmStep(index: number) {
    const step = orderSteps[index];
    const ok = await trigger(stepFields(step, getValues() as Values) as FieldPath<OrderForm>[], { shouldFocus: true });
    if (!ok || (step === "entrega" && rejectPastPickup())) return;
    const next = new Set(confirmed).add(step);
    setConfirmed(next);
    goTo(firstOpenStep(next, invalidSteps(getValues())));
  }

  // The order is stored first, then the customer goes to Mercado Pago. The owner sees it once the payment is approved.
  async function onSubmit(data: OrderForm) {
    if (savingRef.current) return;
    // The page may have stayed open past the chosen time.
    if (rejectPastPickup()) return goTo(orderSteps.indexOf("entrega"));
    savingRef.current = true;
    setSaving(true);
    setFailure(null);
    const order = data;
    try {
      const result = await submitOrder(order, items.map((i) => ({ variantId: i.variantId, qty: i.qty, addonValueIds: i.addons?.map((a) => a.id) })));
      if (!result.ok) {
        const fields = Object.entries(result.fieldErrors);
        for (const [field, message] of fields) setError(field as FieldPath<OrderForm>, { type: "server", message });
        // Reopen the earliest step that owns a rejected field.
        if (fields.length > 0) goTo(Math.min(...fields.map(([f]) => orderSteps.indexOf(stepOfField(f)))));
        setFailure(result);
        return;
      }
      if (!result.order.checkoutUrl) {
        setFailure({ ok: false, reason: "unavailable", error: "El pago online no está disponible en este momento. Probá de nuevo más tarde.", fieldErrors: {} });
        return;
      }
      // Mercado Pago takes over. The cart stays until the payment is in, so a rejected payment can be retried.
      window.location.assign(result.order.checkoutUrl);
    } catch {
      setFailure(unavailableResult());
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function onInvalid(fieldErrors: FieldErrors<OrderForm>) {
    const steps = Object.keys(fieldErrors).map((f) => orderSteps.indexOf(stepOfField(f)));
    if (steps.length > 0) goTo(Math.min(...steps));
  }

  // Enter in any field confirms the current step; only the last step submits the order.
  function onFormSubmit(ev: React.FormEvent<HTMLFormElement>) {
    if (active < orderSteps.length - 1) {
      ev.preventDefault();
      void confirmStep(active);
      return;
    }
    void handleSubmit(onSubmit, onInvalid)(ev);
  }

  const fieldProps = (name: string) => fieldA11y(name, errors[name]);
  const continueButton = (index: number) => (
    <Button type="submit" className="w-full sm:w-auto" disabled={invalid.has(orderSteps[index])}>
      Continuar <ArrowRightIcon aria-hidden />
    </Button>
  );

  const bodies: Record<StepId, React.ReactNode> = {
    contacto: (
      <>
        <Field id="nombre" label="Nombre y apellido" error={errors.nombre}>
          <Input
            autoComplete="name"
            placeholder="Ej.: Ana Pérez"
            maxLength={120}
            {...fieldProps("nombre")}
            {...register("nombre")}
          />
        </Field>
        <Field id="telefono" label="Teléfono" error={errors.telefono}>
          <Input
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="Ej.: 11 2233 4455"
            maxLength={PHONE_MAX_LENGTH}
            {...fieldProps("telefono")}
            aria-describedby={errors.telefono ? "telefono-hint telefono-error" : "telefono-hint"}
            {...register("telefono")}
          />
          <p id="telefono-hint" className="text-xs text-muted-foreground">
            Para coordinar la entrega.
          </p>
        </Field>
        {continueButton(0)}
      </>
    ),
    entrega: (
      <>
        <DeliveryFields form={form} errors={errors} />
        {continueButton(1)}
      </>
    ),
    revision: (
      <>
        <OrderRecap items={items} />
        <Field id="comentarios" label="Comentarios (opcional)" error={errors.comentarios}>
          <Textarea rows={3} {...fieldProps("comentarios")} {...register("comentarios")} />
        </Field>

        {failure && (
          <div role="alert" className="space-y-3 border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            <p>{failure.error}</p>

          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={saving} aria-busy={saving || undefined}>
          <ArrowRightIcon aria-hidden /> {saving ? "Guardando pedido…" : failure && failure.reason !== "invalid" ? "Reintentar" : "Confirmar y pagar"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Pagás con Mercado Pago. El pedido llega al local una vez acreditado el pago.
        </p>
      </>
    ),
  };

  return (
    <aside className="h-fit space-y-4 border border-border bg-cream p-4 sm:p-6 lg:sticky lg:top-24">
      <h2 className="poster-display text-2xl sm:text-3xl">Tus datos</h2>
      <CheckoutProgress current={active} total={orderSteps.length} />
      <form onSubmit={onFormSubmit} noValidate>
        <ol className="space-y-2">
          {orderSteps.map((step, index) => (
            <CheckoutStep
              key={step}
              index={index}
              title={stepTitles[step]}
              status={stepStatus(index, active, open)}
              summary={summaryOf(step, values)}
              focusOnOpen={moved}
              onOpen={() => goTo(index)}
            >
              {bodies[step]}
            </CheckoutStep>
          ))}
        </ol>
      </form>
    </aside>
  );
}

/** What is being ordered, from the cart: one line per item, units and the estimated total. */
function OrderRecap({ items }: { items: CartItem[] }) {
  const setQty = useCart((s) => s.setQty);
  const units = totalUnits(items);
  const totals = cartTotals(items);
  return (
    <div className="border border-border bg-ivory p-3 text-sm">
      <ul className="space-y-2">
        {items.map((i) => (
          // Name over the stepper on phones (two lines at most), side by side from `sm` up.
          <li key={cartLineKey(i)} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <span className="line-clamp-2 min-w-0">
              {i.productName} <span className="text-muted-foreground">— {i.valuesLabel}</span>
            </span>
            <QtyStepper
              size="sm"
              className="shrink-0 self-start sm:self-auto"
              label={`Cantidad de ${i.productName}`}
              value={i.qty}
              max={MAX_QTY}
              onChange={(qty) => setQty(cartLineKey(i), qty)}
            />
          </li>
        ))}
      </ul>
      <p className="mt-2 flex justify-between gap-3 border-t-2 border-border pt-2 font-bold">
        <span>{unitsLabel(units)}</span>
        <span className="tabular-nums">
          {totals.pricedLines === 0 ? "A cotizar" : `${totals.partial ? "Parcial " : ""}${formatArs(totals.total)}`}
        </span>
      </p>
    </div>
  );
}
