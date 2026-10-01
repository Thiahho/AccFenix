import { describe, expect, it } from "vitest";
import { normalizeSiteUrl } from "./site";

const SITE = "https://fenix-accesorios-barrales.vercel.app";

describe("normalizeSiteUrl", () => {
  it("deja intacta una URL completa", () => {
    expect(normalizeSiteUrl(SITE)).toBe(SITE);
    expect(normalizeSiteUrl("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("agrega https cuando falta el esquema", () => {
    expect(normalizeSiteUrl("fenix-accesorios-barrales.vercel.app")).toBe(SITE);
  });

  it("quita espacios y barras finales", () => {
    expect(normalizeSiteUrl(` ${SITE}/ `)).toBe(SITE);
  });

  it("usa localhost si no está definida o está vacía", () => {
    expect(normalizeSiteUrl(undefined)).toBe("http://localhost:3000");
    expect(normalizeSiteUrl("")).toBe("http://localhost:3000");
  });

  it("siempre devuelve algo que new URL() acepta", () => {
    for (const value of [undefined, "", "fenix-accesorios-barrales.vercel.app", `${SITE}/`]) {
      expect(() => new URL(normalizeSiteUrl(value))).not.toThrow();
    }
  });
});
