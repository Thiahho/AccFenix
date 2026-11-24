import { describe, expect, it } from "vitest";
import { firstOpenStep, invalidSteps, orderSteps, stepFields, stepOfField, stepStatus, type StepId } from "@/lib/orders/steps";

describe("orderSteps", () => {
  it("starts at the contact step, with no customer type question", () => {
    expect(orderSteps).toEqual(["contacto", "entrega", "revision"]);
  });
});

describe("stepFields", () => {
  it("asks for the address only when the order is delivered", () => {
    expect(stepFields("entrega", { entrega: "envio" })).toEqual(["entrega", "direccion", "horario"]);
    expect(stepFields("entrega", { entrega: "retiro" })).toEqual(["entrega", "horario"]);
  });
});

describe("stepOfField", () => {
  it("maps each field to its step and sends unknown ones to the review", () => {
    expect(stepOfField("direccion")).toBe("entrega");
    expect(stepOfField("nombre")).toBe("contacto");
    expect(stepOfField("cualquiera")).toBe("revision");
  });
});

describe("invalidSteps", () => {
  it("is empty for a complete order", () => {
    expect(invalidSteps({ nombre: "Ana", entrega: "retiro", horario: "16:00" }).size).toBe(0);
  });

  it("ignores a customer type left by an older checkout", () => {
    expect(invalidSteps({ cliente: "comercio", nombre: "Ana", entrega: "retiro", horario: "16:00" }).size).toBe(0);
  });

  it("flags the step that owns the missing field", () => {
    const invalid = invalidSteps({ nombre: "Ana", entrega: "envio", horario: "16 h" });
    expect([...invalid]).toEqual(["entrega"]);
  });
});

describe("firstOpenStep and stepStatus", () => {
  it("opens the first step that is not confirmed and valid", () => {
    const confirmed = new Set<StepId>(["contacto"]);
    expect(firstOpenStep(confirmed, new Set())).toBe(1);
    expect(firstOpenStep(new Set(orderSteps), new Set())).toBe(orderSteps.length - 1);
  });

  it("reopens an earlier step when it became invalid", () => {
    const confirmed = new Set<StepId>(["contacto", "entrega"]);
    expect(firstOpenStep(confirmed, new Set<StepId>(["entrega"]))).toBe(1);
  });

  it("labels steps as done, active, open or locked", () => {
    expect(stepStatus(0, 2, 2)).toBe("done");
    expect(stepStatus(2, 2, 2)).toBe("active");
    expect(stepStatus(3, 1, 2)).toBe("locked");
  });
});
