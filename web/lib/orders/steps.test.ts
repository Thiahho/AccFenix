import { describe, expect, it } from "vitest";
import { firstOpenStep, invalidSteps, orderSteps, stepFields, stepOfField, stepStatus, type StepId } from "@/lib/orders/steps";

const complete = {
  cliente: "personal",
  nombre: "Ana",
  zona: "buenos-aires",
  localidad: "Quilmes",
  direccion: "Calle 123",
};

const set = (...ids: StepId[]) => new Set<StepId>(ids);

describe("order steps", () => {
  it("runs who, contact, delivery and review in order", () => {
    expect(orderSteps).toEqual(["cliente", "contacto", "entrega", "revision"]);
  });

  it("lists the fields each step validates, following the chosen options", () => {
    expect(stepFields("cliente", {})).toEqual(["cliente"]);
    expect(stepFields("contacto", { cliente: "personal" })).toEqual(["nombre"]);
    expect(stepFields("contacto", { cliente: "comercio" })).toEqual(["nombre"]);
    expect(stepFields("entrega", { zona: "buenos-aires" })).toEqual(["zona", "localidad", "direccion"]);
    expect(stepFields("entrega", { zona: "otra-provincia" })).toEqual(["zona", "provincia", "expreso"]);
    expect(stepFields("revision", {})).toEqual(["comentarios"]);
  });

  it("finds the step that owns a field, so server errors can reopen it", () => {
    expect(stepOfField("nombre")).toBe("contacto");
    expect(stepOfField("expreso")).toBe("entrega");
    expect(stepOfField("comentarios")).toBe("revision");
    expect(stepOfField("cliente")).toBe("cliente");
  });
});

describe("invalidSteps", () => {
  it("is empty for a complete order", () => {
    expect(invalidSteps(complete)).toEqual(set());
  });

  it("flags only the steps whose fields fail", () => {
    expect(invalidSteps({ ...complete, nombre: "" })).toEqual(set("contacto"));
    expect(invalidSteps({ ...complete, direccion: "" })).toEqual(set("entrega"));
    expect(invalidSteps({ ...complete, comentarios: "a".repeat(501) })).toEqual(set("revision"));
  });

  it("flags the first step until a customer type is chosen", () => {
    expect(invalidSteps({ ...complete, cliente: undefined }).has("cliente")).toBe(true);
  });

  it("keeps contact valid when switching to a business", () => {
    expect(invalidSteps({ ...complete, cliente: "comercio" })).toEqual(set());
  });
});

describe("firstOpenStep", () => {
  it("stops at the first step that is not both confirmed and valid", () => {
    expect(firstOpenStep(set(), set())).toBe(0);
    expect(firstOpenStep(set("cliente"), set())).toBe(1);
    expect(firstOpenStep(set("cliente", "contacto", "entrega"), set())).toBe(3);
    expect(firstOpenStep(set("cliente", "contacto", "entrega"), set("contacto"))).toBe(1);
  });

  it("never goes past the review step", () => {
    expect(firstOpenStep(set("cliente", "contacto", "entrega", "revision"), set())).toBe(3);
  });
});

describe("firstOpenStep after confirming a step", () => {
  it("moves to the step after the confirmed one when everything before is done", () => {
    expect(firstOpenStep(set("cliente"), set())).toBe(1);
    expect(firstOpenStep(set("cliente", "contacto", "entrega"), set())).toBe(3);
  });

  it("skips steps that stay confirmed and valid after editing an earlier one", () => {
    expect(firstOpenStep(set("cliente", "contacto", "entrega"), set())).toBe(3);
  });

  it("goes back to a later step that the edit invalidated", () => {
    expect(firstOpenStep(set("cliente", "contacto", "entrega"), set("contacto"))).toBe(1);
  });
});

describe("stepStatus", () => {
  it("marks steps before the open one done, the active one active and the rest locked", () => {
    expect(stepStatus(0, 1, 1)).toBe("done");
    expect(stepStatus(1, 1, 1)).toBe("active");
    expect(stepStatus(2, 1, 1)).toBe("locked");
  });

  it("keeps reachable steps unlocked while an earlier one is reopened", () => {
    expect(stepStatus(0, 0, 3)).toBe("active");
    expect(stepStatus(2, 0, 3)).toBe("done");
    expect(stepStatus(3, 0, 3)).toBe("open");
  });
});
