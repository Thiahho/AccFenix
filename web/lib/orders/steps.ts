import { orderSchema } from "@/lib/order";

/** The checkout runs as four steps; each one unlocks the next once it is confirmed and valid. */
export const orderSteps = ["cliente", "contacto", "entrega", "revision"] as const;

export type StepId = (typeof orderSteps)[number];

export type StepStatus = "done" | "active" | "open" | "locked";

/** The options that change which fields a step shows. */
export type StepValues = { cliente?: string; zona?: string };

/** Fields a step validates before moving on, following the chosen customer type and zone. */
export function stepFields(step: StepId, values: StepValues): string[] {
  switch (step) {
    case "cliente":
      return ["cliente"];
    case "contacto":
      return ["nombre"];
    case "entrega":
      return values.zona === "otra-provincia" ? ["zona", "provincia", "expreso"] : ["zona", "localidad", "direccion"];
    case "revision":
      return ["comentarios"];
  }
}

const stepByField: Record<string, StepId> = {
  cliente: "cliente",
  nombre: "contacto",
  zona: "entrega",
  localidad: "entrega",
  direccion: "entrega",
  ubicacion: "entrega",
  provincia: "entrega",
  expreso: "entrega",
  comentarios: "revision",
};

/** The step that owns a field, so an error from the server can reopen it. Unknown fields land on the review. */
export function stepOfField(field: string): StepId {
  return stepByField[field] ?? "revision";
}

/** Steps whose fields do not pass the order schema with the current values. */
export function invalidSteps(values: unknown): Set<StepId> {
  const result = orderSchema.safeParse(values);
  const invalid = new Set<StepId>();
  if (result.success) return invalid;
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    invalid.add(typeof key === "string" ? stepOfField(key) : "cliente");
  }
  return invalid;
}

const complete = (step: StepId, confirmed: ReadonlySet<StepId>, invalid: ReadonlySet<StepId>) =>
  confirmed.has(step) && !invalid.has(step);

/**
 * Index of the first step that is not confirmed and valid: every step before it is done, every step after it locked.
 * It is also where the checkout goes after confirming a step, so an edit that invalidates a later step reopens it.
 */
export function firstOpenStep(confirmed: ReadonlySet<StepId>, invalid: ReadonlySet<StepId>): number {
  const last = orderSteps.length - 1;
  for (let i = 0; i < last; i++) {
    if (!complete(orderSteps[i], confirmed, invalid)) return i;
  }
  return last;
}

/** How a step renders given the active step and the first open one. */
export function stepStatus(index: number, active: number, open: number): StepStatus {
  if (index === active) return "active";
  if (index < open) return "done";
  if (index === open) return "open";
  return "locked";
}
