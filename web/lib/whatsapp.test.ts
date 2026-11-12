import { describe, expect, it } from "vitest";
import type { OrderForm } from "@/lib/order";
import { buildOrderMessage, buildProfessionalMessage, buildVariantMessage, isWholesale, whatsappUrl } from "@/lib/whatsapp";
import type { CartItem } from "@/stores/cart";

const items: CartItem[] = [
  { variantId: 1, productSlug: "barral", productName: "Barral", categoryName: "Barrales", valuesLabel: "Medida 2.40 · Grosor 34 · Color Caoba", availability: "disponible", qty: 2 },
  { variantId: 2, productSlug: "argollas", productName: "Argollas", categoryName: "Accesorios", valuesLabel: "Grosor 22 · Color Natural", availability: "aPedido", qty: 120 },
  { variantId: 3, productSlug: "barral", productName: "Barral", categoryName: "Barrales", valuesLabel: "Medida 1.20 · Grosor 22 · Color Cedro", availability: "disponible", qty: 1 },
];

const baForm: OrderForm = { zona: "buenos-aires", nombre: "Ana", telefono: "11 5555-5555", localidad: "Quilmes", direccion: "Calle 123" };
const interiorForm: OrderForm = { zona: "otra-provincia", nombre: "Juan", telefono: "351 444", provincia: "Córdoba", expreso: "Vía Cargo" };

describe("buildOrderMessage", () => {
  it("groups items by category with quantities and variants", () => {
    const msg = buildOrderMessage(items, baForm, 100);
    expect(msg).toContain("*Barrales*\n• 2 × Barral — Medida 2.40 · Grosor 34 · Color Caoba\n• 1 × Barral — Medida 1.20 · Grosor 22 · Color Cedro");
    expect(msg).toContain("• 120 × Argollas — Grosor 22 · Color Natural _(a pedido)_");
    expect(msg).toContain("Total: 123 unidades");
  });

  it("includes Buenos Aires address", () => {
    const msg = buildOrderMessage(items, baForm, 100);
    expect(msg).toContain("Localidad: Quilmes");
    expect(msg).toContain("Dirección: Calle 123");
    expect(msg).not.toContain("Expreso");
    expect(msg).not.toContain("Ubicación");
  });

  it("links the exact location when it was captured", () => {
    const msg = buildOrderMessage(items, { ...baForm, ubicacion: { lat: -34.6041348, lng: -58.8696918 } }, 100);
    expect(msg).toContain("Dirección: Calle 123\nUbicación: https://www.google.com/maps?q=-34.604135,-58.869692");
  });

  it("includes province and carrier for the interior", () => {
    const msg = buildOrderMessage(items, interiorForm, 100);
    expect(msg).toContain("Provincia: Córdoba");
    expect(msg).toContain("Expreso de preferencia: Vía Cargo");
    expect(msg).not.toContain("Localidad");
  });

  it("flags wholesale orders at or above the threshold", () => {
    expect(buildOrderMessage(items, baForm, 123)).toContain("*PEDIDO MAYORISTA* (123 unidades)");
    expect(buildOrderMessage(items, baForm, 124)).not.toContain("MAYORISTA");
    expect(isWholesale(items, 0)).toBe(false);
  });

  it("does not mention prices when no variant has one", () => {
    expect(buildOrderMessage(items, baForm, 100)).not.toMatch(/\$|precio|consultar/i);
  });
});

describe("buildOrderMessage with prices", () => {
  const priced = (retail: (number | null)[], wholesale: (number | null)[] = []): CartItem[] =>
    items.map((item, i) => ({ ...item, retailPrice: retail[i] ?? null, wholesalePrice: wholesale[i] ?? null }));

  it("adds unit price and subtotal to each line and ends with the retail total", () => {
    const msg = buildOrderMessage(priced([1250.5, 10, 800]), baForm, 0);
    expect(msg).toContain("• 2 × Barral — Medida 2.40 · Grosor 34 · Color Caoba — $ 1.250,50 c/u = $ 2.501,00");
    expect(msg).toContain("• 120 × Argollas — Grosor 22 · Color Natural _(a pedido)_ — $ 10,00 c/u = $ 1.200,00");
    expect(msg).toContain("Total: 123 unidades");
    expect(msg.endsWith("\n\n*Total: $ 4.501,00* (precios minoristas)")).toBe(true);
    expect(msg).not.toMatch(/parcial|consultar/i);
  });

  it("applies wholesale prices at the threshold, falling back to retail where there is none", () => {
    const msg = buildOrderMessage(priced([1250.5, 10, 800], [1000, 8, null]), baForm, 123);
    expect(msg).toContain("*PEDIDO MAYORISTA* (123 unidades)");
    expect(msg).toContain("Color Caoba — $ 1.000,00 c/u = $ 2.000,00");
    expect(msg).toContain("_(a pedido)_ — $ 8,00 c/u = $ 960,00");
    expect(msg).toContain("Color Cedro — $ 800,00 c/u = $ 800,00");
    expect(msg.endsWith("*Total: $ 3.760,00* (precios mayoristas)")).toBe(true);
  });

  it("keeps retail prices one unit below the threshold", () => {
    const msg = buildOrderMessage(priced([1250.5, 10, 800], [1000, 8, null]), baForm, 124);
    expect(msg).not.toContain("MAYORISTA");
    expect(msg.endsWith("*Total: $ 4.501,00* (precios minoristas)")).toBe(true);
  });

  it("marks unpriced lines and ends with a partial total in a mixed cart", () => {
    const msg = buildOrderMessage(priced([1250.5, null, 800]), { ...baForm, comentarios: "Entregar por la tarde" }, 0);
    expect(msg).toContain("• 120 × Argollas — Grosor 22 · Color Natural _(a pedido)_ — precio a consultar");
    expect(msg).toContain("Comentarios: Entregar por la tarde\n\n*Total parcial: $ 3.301,00* (precios minoristas)");
    expect(msg.endsWith("Los productos sin precio se cotizan por WhatsApp.")).toBe(true);
  });
});

describe("whatsappUrl", () => {
  it("strips non-digits and encodes the text", () => {
    expect(whatsappUrl("+54 9 11 1234-5678", "Hola & chau")).toBe("https://wa.me/5491112345678?text=Hola%20%26%20chau");
  });

  it("keeps customer text inside the text parameter", () => {
    const url = new URL(whatsappUrl("5491112345678", "Nombre: Ana&phone=999#x\nDirección: Calle 1?a=b"));
    expect([...url.searchParams.keys()]).toEqual(["text"]);
    expect(url.searchParams.get("text")).toBe("Nombre: Ana&phone=999#x\nDirección: Calle 1?a=b");
    expect(url.hash).toBe("");
    expect(url.pathname).toBe("/5491112345678");
  });
});

describe("buildVariantMessage", () => {
  it("names the product and the chosen variant, without prices", () => {
    const msg = buildVariantMessage("Barral", "Medida 2.40 · Grosor 34 · Color Caoba");
    expect(msg).toContain("• Barral — Medida 2.40 · Grosor 34 · Color Caoba");
    expect(msg).not.toMatch(/\$|precio/i);
  });
});

describe("buildProfessionalMessage", () => {
  it("mentions the wholesale threshold only when there is one", () => {
    expect(buildProfessionalMessage(100)).toContain("pedidos desde 100 unidades");
    expect(buildProfessionalMessage(0)).not.toContain("desde");
  });
});
