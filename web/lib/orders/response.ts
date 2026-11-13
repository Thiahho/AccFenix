import type { CreatedOrder } from "@/lib/orders/types";

/** Form fields that can show an error coming from the API. */
export type OrderFormField = "nombre" | "telefono" | "localidad" | "direccion" | "provincia" | "expreso" | "comentarios";

export type OrderFieldErrors = Partial<Record<OrderFormField, string>>;

export type SubmitOrderFailure = {
  ok: false;
  /** `invalid`: the data must be fixed; `rateLimited`: wait and retry; `unavailable`: the order could not be stored. */
  reason: "invalid" | "rateLimited" | "unavailable";
  error: string;
  fieldErrors: OrderFieldErrors;
};

export type SubmitOrderResult = { ok: true; order: CreatedOrder } | SubmitOrderFailure;

/** Validator keys (PascalCase, compared lowercased) mapped to the form fields that show them. */
const fieldByKey: Record<string, OrderFormField> = {
  customername: "nombre",
  phone: "telefono",
  locality: "localidad",
  address: "direccion",
  province: "provincia",
  carrier: "expreso",
  comments: "comentarios",
};

const INVALID_FIELDS = "Revisá los datos marcados.";
const INVALID_GENERIC = "No pudimos procesar el pedido. Revisá los datos y probá de nuevo.";
const INVALID_LOCATION = "La ubicación captada no es válida. Quitala y probá de nuevo.";
const INVALID_QUANTITIES = "Revisá las cantidades de tu pedido.";
const FIELD_FALLBACK = "Revisá este dato";

export function unavailableResult(): SubmitOrderFailure {
  return { ok: false, reason: "unavailable", error: "No pudimos guardar tu pedido. Probá de nuevo en unos instantes.", fieldErrors: {} };
}

/** FluentValidation's default messages are English and start with the quoted property name. */
const isDefaultMessage = (message: string) => message.startsWith("'");

/** Translates the API answer to `POST /api/orders` into something the order form can show. */
export function interpretOrderResponse(status: number, body: unknown): SubmitOrderResult {
  if (status === 200 || status === 201) return { ok: true, order: body as CreatedOrder };
  if (status === 429) {
    return { ok: false, reason: "rateLimited", error: "Recibimos demasiados pedidos desde tu conexión. Probá de nuevo en unos minutos.", fieldErrors: {} };
  }
  if (status !== 400) return unavailableResult();

  const errors = (body as { errors?: Record<string, string[]> } | null)?.errors ?? {};
  const fieldErrors: OrderFieldErrors = {};
  const general: string[] = [];
  for (const [key, messages] of Object.entries(errors)) {
    const message = messages?.[0];
    if (!message) continue;
    const normalized = key.toLowerCase();
    const field = fieldByKey[normalized];
    if (field) fieldErrors[field] ??= isDefaultMessage(message) ? FIELD_FALLBACK : message;
    else if (normalized === "latitude" || normalized === "longitude") general.push(INVALID_LOCATION);
    else if (normalized.startsWith("items[")) general.push(INVALID_QUANTITIES);
    else general.push(isDefaultMessage(message) ? INVALID_GENERIC : message);
  }

  const error = general[0] ?? (Object.keys(fieldErrors).length > 0 ? INVALID_FIELDS : INVALID_GENERIC);
  return { ok: false, reason: "invalid", error, fieldErrors };
}
