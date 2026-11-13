"use client";

import { useMemo, useRef, useState } from "react";
import { Controller, useForm, type FieldErrors, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightIcon, HomeIcon, MessageCircleIcon, StoreIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { CheckoutProgress, CheckoutStep } from "@/components/site/checkout-step";
import { DeliveryFields, type CapturedLocation } from "@/components/site/delivery-fields";
import { Field, fieldA11y } from "@/components/site/form-field";
import { submitOrder } from "@/app/actions/orders";
import type { PublicSettings } from "@/lib/api";
import type { Coords } from "@/lib/geo";
import { orderSchema, type CustomerChoice, type OrderForm } from "@/lib/order";
import { unavailableResult, type SubmitOrderFailure } from "@/lib/orders/response";
import { firstOpenStep, invalidSteps, orderSteps, stepFields, stepOfField, stepStatus, type StepId } from "@/lib/orders/steps";
import { cartTotals, formatArs } from "@/lib/pricing";
import { buildOrderMessage, whatsappUrl } from "@/lib/whatsapp";
import { QtyStepper } from "@/components/site/qty-stepper";
import { MAX_QTY, totalUnits, useCart, type CartItem } from "@/stores/cart";

/** A stored order: its number and the WhatsApp link with the message that names it. */
export type PlacedOrder = { number: number; whatsappHref: string };

const stepTitles: Record<StepId, string> = {
  cliente: "¿Para quién es?",
  contacto: "¿Cómo te llamás?",
  entrega: "¿Dónde entregamos?",
  revision: "Revisá y enviá",
};

const customerOptions: { value: CustomerChoice; label: string; hint: string; Icon: typeof HomeIcon }[] = [
  { value: "personal", label: "Personal", hint: "Para tu casa", Icon: HomeIcon },
  { value: "comercio", label: "Comercio", hint: "Almacén, restaurante, etc.", Icon: StoreIcon },
];

type Values = Partial<Record<string, unknown>>;
const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function summaryOf(step: StepId, v: Values): string {
  switch (step) {
    case "cliente":
      return v.cliente === "comercio" ? "Comercio" : v.cliente === "personal" ? "Personal" : "";
    case "contacto":
      return text(v.nombre);
    case "entrega":
      return v.zona === "otra-provincia"
        ? [text(v.provincia), text(v.expreso)].filter(Boolean).join(" · ")
        : [text(v.direccion), text(v.localidad)].filter(Boolean).join(", ");
    case "revision":
      return "";
  }
}

/**
 * Step-by-step checkout over one react-hook-form instance: who the order is for, contact, delivery, then review and
 * send. Each step validates its own fields (`trigger`) and unlocks the next; done steps collapse to an editable
 * summary. The order is stored through the server action before WhatsApp opens.
 */
export function OrderFormCard({ items, settings, onPlaced }: { items: CartItem[]; settings: PublicSettings; onPlaced: (order: PlacedOrder) => void }) {
  const clear = useCart((s) => s.clear);
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [failure, setFailure] = useState<SubmitOrderFailure | null>(null);
  // Data of the last attempt, so "Enviar igual por WhatsApp" can send it without storing the order.
  const [lastOrder, setLastOrder] = useState<OrderForm | null>(null);
  const form = useForm<OrderForm>({
    resolver: zodResolver(orderSchema),
    defaultValues: { zona: "buenos-aires", nombre: "", localidad: "", direccion: "", comentarios: "" },
    // Errors show once a field is left, so a disabled "Continuar" never hides why.
    mode: "onTouched",
    // Collapsed steps unmount their fields; their values must survive.
    shouldUnregister: false,
  });
  const { register, control, handleSubmit, watch, getValues, setValue, setError, trigger, formState } = form;
  const values = watch() as Values;
  const [near, setNear] = useState<Coords | null>(null);
  const [ubicacion, setUbicacion] = useState<CapturedLocation | null>(null);

  const [confirmed, setConfirmed] = useState<ReadonlySet<StepId>>(() => new Set());
  const [active, setActive] = useState(0);
  // Steps only steal focus after the visitor starts moving through them.
  const [moved, setMoved] = useState(false);
  const invalid = useMemo(() => invalidSteps(values), [values]);
  const open = firstOpenStep(confirmed, invalid);

  const errors = Object.fromEntries(
    Object.entries(formState.errors as FieldErrors<Record<string, string>>).map(([k, v]) => [k, v?.message]),
  ) as Partial<Record<string, string>>;
  const canSend = settings.whatsappNumber.length > 0;

  function goTo(index: number) {
    setMoved(true);
    setActive(index);
  }

  async function confirmStep(index: number) {
    const step = orderSteps[index];
    const ok = await trigger(stepFields(step, getValues() as Values) as FieldPath<OrderForm>[], { shouldFocus: true });
    if (!ok) return;
    const next = new Set(confirmed).add(step);
    setConfirmed(next);
    goTo(firstOpenStep(next, invalidSteps(getValues())));
  }

  function chooseCustomer(value: CustomerChoice, advance: boolean) {
    setValue("cliente", value, { shouldDirty: true });
    if (advance) void confirmStep(0);
  }

  // The order is stored first; WhatsApp opens only with the number the server assigned.
  async function onSubmit(data: OrderForm) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setFailure(null);
    const order = data.zona === "buenos-aires" && ubicacion ? { ...data, ubicacion: ubicacion.coords } : data;
    setLastOrder(order);
    try {
      const result = await submitOrder(order, items.map((i) => ({ variantId: i.variantId, qty: i.qty })));
      if (!result.ok) {
        const fields = Object.entries(result.fieldErrors);
        for (const [field, message] of fields) setError(field as FieldPath<OrderForm>, { type: "server", message });
        // Reopen the earliest step that owns a rejected field.
        if (fields.length > 0) goTo(Math.min(...fields.map(([f]) => orderSteps.indexOf(stepOfField(f)))));
        setFailure(result);
        return;
      }
      const message = buildOrderMessage(items, order, settings.wholesaleThreshold, result.order);
      const whatsappHref = whatsappUrl(settings.whatsappNumber, message);
      // Best effort only: after the await this is no longer a user gesture, so iOS and popup blockers may drop it.
      // The success panel's "Abrir WhatsApp" button is the reliable path.
      window.open(whatsappHref, "_blank", "noopener,noreferrer");
      clear();
      onPlaced({ number: result.order.number, whatsappHref });
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

  // Fallback when the order could not be stored: the sale still reaches WhatsApp, without an order number.
  function sendWithoutSaving() {
    if (!lastOrder) return;
    const message = buildOrderMessage(items, lastOrder, settings.wholesaleThreshold);
    window.open(whatsappUrl(settings.whatsappNumber, message), "_blank", "noopener,noreferrer");
    setFailure(null);
    setSent(true);
  }

  if (sent) {
    return (
      <aside className="h-fit rounded-xl border bg-brand-soft/50 p-6">
        <h2 className="text-lg font-semibold">¿Se abrió WhatsApp?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Enviá el mensaje desde WhatsApp y lo registramos al recibirlo. Si ya lo enviaste, podés vaciar el pedido.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={clear}>Ya lo envié, vaciar pedido</Button>
          <Button variant="outline" onClick={() => setSent(false)}>Volver a los datos</Button>
        </div>
      </aside>
    );
  }

  const fieldProps = (name: string) => fieldA11y(name, errors[name]);
  const continueButton = (index: number) => (
    <Button type="submit" className="w-full sm:w-auto" disabled={invalid.has(orderSteps[index])}>
      Continuar <ArrowRightIcon aria-hidden />
    </Button>
  );

  const bodies: Record<StepId, React.ReactNode> = {
    cliente: (
      <>
        <Controller
          control={control}
          name="cliente"
          render={({ field }) => (
            <RadioGroup
              aria-label={stepTitles.cliente}
              aria-invalid={errors.cliente ? true : undefined}
              aria-describedby={errors.cliente ? "cliente-error" : undefined}
              value={field.value ?? ""}
              onValueChange={(v) => chooseCustomer(v as CustomerChoice, false)}
              onKeyDown={(ev) => {
                // Arrow keys only move the choice; Enter confirms it.
                if (ev.key === "Enter" && field.value) {
                  ev.preventDefault();
                  void confirmStep(0);
                }
              }}
              className="grid grid-cols-2 gap-3"
            >
              {customerOptions.map(({ value, label, hint, Icon }) => (
                <Label
                  key={value}
                  htmlFor={`cliente-${value}`}
                  // A pointer click or tap on the card picks and moves on (detail > 0); arrow keys and Space only
                  // select, so keyboard users confirm with Enter or "Continuar".
                  onClick={(ev) => ev.detail > 0 && chooseCustomer(value, true)}
                  className="relative flex min-h-32 cursor-pointer flex-col items-start gap-2 rounded-xl border-2 bg-background p-4 font-normal transition-[border-color,background-color,transform] duration-200 hover:border-brand/60 active:scale-[0.98] has-data-[state=checked]:border-brand has-data-[state=checked]:bg-brand-soft"
                >
                  <RadioGroupItem
                    id={`cliente-${value}`}
                    value={value}
                    className="absolute top-3 right-3"
                  />
                  <Icon aria-hidden className="size-7 text-brand" />
                  <span className="text-base font-semibold">{label}</span>
                  <span className="text-xs text-muted-foreground">{hint}</span>
                </Label>
              ))}
            </RadioGroup>
          )}
        />
        {errors.cliente && (
          <p id="cliente-error" role="alert" className="text-sm text-destructive">
            {errors.cliente}
          </p>
        )}
        {values.cliente ? continueButton(0) : null}
      </>
    ),
    contacto: (
      <>
        <Field id="nombre" label={values.cliente === "comercio" ? "Tu nombre o el del comercio" : "Nombre y apellido"} error={errors.nombre}>
          <Input
            autoComplete={values.cliente === "comercio" ? "organization" : "name"}
            placeholder={values.cliente === "comercio" ? "Ej.: Almacén Don Pepe" : "Ej.: Ana Pérez"}
            maxLength={120}
            {...fieldProps("nombre")}
            {...register("nombre")}
          />
        </Field>
        {/* No phone: the order is sent from the customer's own WhatsApp, so the distributor already has the number. */}
        <p className="text-sm text-muted-foreground">Te respondemos por WhatsApp, al número desde el que nos mandes el pedido.</p>
        {continueButton(1)}
      </>
    ),
    entrega: (
      <>
        <DeliveryFields form={form} errors={errors} near={near} onNearChange={setNear} ubicacion={ubicacion} onUbicacionChange={setUbicacion} />
        {continueButton(2)}
      </>
    ),
    revision: (
      <>
        <OrderRecap items={items} threshold={settings.wholesaleThreshold} />
        <Field id="comentarios" label="Comentarios (opcional)" error={errors.comentarios}>
          <Textarea rows={3} {...fieldProps("comentarios")} {...register("comentarios")} />
        </Field>

        {failure && (
          <div role="alert" className="space-y-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <p>{failure.error}</p>
            {failure.reason !== "invalid" && lastOrder && (
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={sendWithoutSaving}>
                Enviar igual por WhatsApp
              </Button>
            )}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={!canSend || saving} aria-busy={saving || undefined}>
          <MessageCircleIcon aria-hidden /> {saving ? "Guardando pedido…" : failure && failure.reason !== "invalid" ? "Reintentar" : "Enviar pedido por WhatsApp"}
        </Button>
        {!canSend && <p className="text-sm text-destructive">El envío por WhatsApp no está disponible en este momento.</p>}
        <p className="text-xs text-muted-foreground">
          {items.some((i) => i.retailPrice != null)
            ? "Los precios no incluyen el envío: te contactamos para confirmar el pedido y coordinar la entrega."
            : "No calculamos precios ni envío online: te contactamos para cotizar y coordinar la entrega."}
        </p>
      </>
    ),
  };

  return (
    <aside className="h-fit space-y-4 rounded-xl border p-4 sm:p-6 lg:sticky lg:top-24">
      <h2 className="text-lg font-semibold">Tus datos</h2>
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
function OrderRecap({ items, threshold }: { items: CartItem[]; threshold: number }) {
  const setQty = useCart((s) => s.setQty);
  const units = totalUnits(items);
  const totals = cartTotals(items, threshold);
  return (
    <div className="rounded-lg bg-brand-soft/50 p-3 text-sm">
      <ul className="space-y-2">
        {items.map((i) => (
          // Name over the stepper on phones (two lines at most), side by side from `sm` up.
          <li key={i.variantId} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <span className="line-clamp-2 min-w-0">
              {i.productName} <span className="text-muted-foreground">— {i.valuesLabel}</span>
            </span>
            <QtyStepper
              size="sm"
              className="shrink-0 self-start sm:self-auto"
              label={`Cantidad de ${i.productName}`}
              value={i.qty}
              max={MAX_QTY}
              onChange={(qty) => setQty(i.variantId, qty)}
            />
          </li>
        ))}
      </ul>
      <p className="mt-2 flex justify-between gap-3 border-t border-brand/15 pt-2 font-semibold">
        <span>
          {units} {units === 1 ? "unidad" : "unidades"}
          {totals.wholesale && <span className="ml-1.5 font-normal text-muted-foreground">(mayorista)</span>}
        </span>
        <span className="tabular-nums">
          {totals.pricedLines === 0 ? "A cotizar" : `${totals.partial ? "Parcial " : ""}${formatArs(totals.total)}`}
        </span>
      </p>
    </div>
  );
}
