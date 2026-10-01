import { describe, expect, it } from "vitest";
import { filterProvincias, provincias } from "./provincias";

describe("filterProvincias", () => {
  it("devuelve todas si no se escribió nada", () => {
    expect(filterProvincias("")).toEqual([...provincias]);
    expect(filterProvincias("   ")).toEqual([...provincias]);
  });

  it("ignora acentos y mayúsculas", () => {
    expect(filterProvincias("cordoba")).toEqual(["Córdoba"]);
    expect(filterProvincias("TUCU")).toEqual(["Tucumán"]);
    expect(filterProvincias("Río")).toEqual(["Entre Ríos", "La Rioja", "Río Negro"]);
  });

  it("busca en cualquier parte del nombre", () => {
    expect(filterProvincias("cor")).toEqual(["Córdoba", "Corrientes"]);
    expect(filterProvincias("san")).toEqual(["San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero"]);
  });

  it("devuelve vacío si no hay coincidencias", () => {
    expect(filterProvincias("xyz")).toEqual([]);
  });
});
