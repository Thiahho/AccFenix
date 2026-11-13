import { describe, expect, it } from "vitest";
import type { OrderForm } from "@/lib/order";
import { buildOrderMessage, buildWholesaleMessage, buildVariantMessage, isWholesale, whatsappUrl } from "@/lib/whatsapp";
import type { CartItem } from "@/stores/cart";

const items: CartItem[] = [
  { variantId: 1, productSlug: "huevos-n1", productName: "Huevos N°1", categoryName: "Huevos", valuesLabel: "Presentación Cajón", availability: "disponible", qty: 2 },
  { variantId: 2, productSlug: "huevos-de-campo", productName: "Huevos de campo", categoryName: "Especiales", valuesLabel: "Presentación Medio cajón", availability: "aPedido", qty: 120 },
  { variantId: 3, productSlug: "huevos-n1", productName: "Huevos N°1", categoryName: "Huevos", valuesLabel: "Presentación Maple", availability: "disponible", qty: 1 },
];

const baForm: OrderForm = { cliente: "personal", zona: "buenos-aires", nombre: "Ana", telefono: "11 5555-5555", localidad: "Quilmes", direccion: "Calle 123" };
const interiorForm: OrderForm = { cliente: "personal", zona: "otra-provincia", nombre: "Juan", telefono: "351 444", provincia: "Córdoba", expreso: "Vía Cargo" };

describe("buildOrderMessage", () => {
  it("groups items by category with quantities and variants", () => {
    const msg = buildOrderMessage(items, baForm, 100);
    expect(msg).toContain("*Huevos*\n• 2 × Huevos N°1 — Presentación Cajón\n• 1 × Huevos N°1 — Presentación Maple");
    expect(msg).toContain("• 120 × Huevos de campo — Presentación Medio cajón _(a pedido)_");
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

describe("buildOrderMessage customer type", () => {
  const shopForm: OrderForm = { ...baForm, cliente: "comercio", comercio: "Almacén Don Pepe" };
  const saved = { number: 7, isWholesale: false, total: 0, hasUnpricedItems: true, items: [] };

  it("names a personal customer next to the contact name", () => {
    expect(buildOrderMessage(items, baForm, 100)).toContain("*Contacto*\nCliente: Personal\nNombre: Ana");
    expect(buildOrderMessage(items, baForm, 100, saved)).toContain("*Contacto*\nCliente: Personal\nNombre: Ana");
  });

  it("names the business in both the saved and the fallback message", () => {
    expect(buildOrderMessage(items, shopForm, 100)).toContain("*Contacto*\nCliente: Comercio — Almacén Don Pepe\nNombre: Ana");
    expect(buildOrderMessage(items, shopForm, 100, saved)).toContain("Cliente: Comercio — Almacén Don Pepe");
  });

  it("never shows a business name for a personal order", () => {
    expect(buildOrderMessage(items, { ...baForm, comercio: "Viejo" }, 100)).not.toContain("Viejo");
  });
});

describe("buildOrderMessage with prices", () => {
  const priced = (retail: (number | null)[], wholesale: (number | null)[] = []): CartItem[] =>
    items.map((item, i) => ({ ...item, retailPrice: retail[i] ?? null, wholesalePrice: wholesale[i] ?? null }));

  it("adds unit price and subtotal to each line and ends with the retail total", () => {
    const msg = buildOrderMessage(priced([1250, 10, 800]), baForm, 0);
    expect(msg).toContain("• 2 × Huevos N°1 — Presentación Cajón — $ 1.250 c/u = $ 2.500");
    expect(msg).toContain("• 120 × Huevos de campo — Presentación Medio cajón _(a pedido)_ — $ 10 c/u = $ 1.200");
    expect(msg).toContain("Total: 123 unidades");
    expect(msg.endsWith("\n\n*Total: $ 4.500* (precios minoristas)")).toBe(true);
    expect(msg).not.toMatch(/parcial|consultar/i);
  });

  it("applies wholesale prices at the threshold, falling back to retail where there is none", () => {
    const msg = buildOrderMessage(priced([1250, 10, 800], [1000, 8, null]), baForm, 123);
    expect(msg).toContain("*PEDIDO MAYORISTA* (123 unidades)");
    expect(msg).toContain("Presentación Cajón — $ 1.000 c/u = $ 2.000");
    expect(msg).toContain("_(a pedido)_ — $ 8 c/u = $ 960");
    expect(msg).toContain("Presentación Maple — $ 800 c/u = $ 800");
    expect(msg.endsWith("*Total: $ 3.760* (precios mayoristas)")).toBe(true);
  });

  it("keeps retail prices one unit below the threshold", () => {
    const msg = buildOrderMessage(priced([1250, 10, 800], [1000, 8, null]), baForm, 124);
    expect(msg).not.toContain("MAYORISTA");
    expect(msg.endsWith("*Total: $ 4.500* (precios minoristas)")).toBe(true);
  });

  it("marks unpriced lines and ends with a partial total in a mixed cart", () => {
    const msg = buildOrderMessage(priced([1250, null, 800]), { ...baForm, comentarios: "Entregar por la tarde" }, 0);
    expect(msg).toContain("• 120 × Huevos de campo — Presentación Medio cajón _(a pedido)_ — precio a consultar");
    expect(msg).toContain("Comentarios: Entregar por la tarde\n\n*Total parcial: $ 3.300* (precios minoristas)");
    expect(msg.endsWith("Los productos sin precio se cotizan por WhatsApp.")).toBe(true);
  });
});

describe("buildOrderMessage with a saved order", () => {
  const saved = {
    number: 123,
    isWholesale: true,
    total: 2960,
    hasUnpricedItems: true,
    items: [
      { variantId: 1, unitPrice: 1000, subtotal: 2000 },
      { variantId: 2, unitPrice: 8, subtotal: 960 },
      { variantId: 3, unitPrice: null, subtotal: null },
    ],
  };

  it("names the order number right after the greeting", () => {
    const msg = buildOrderMessage(items, baForm, 1000, saved);
    expect(msg.startsWith("¡Hola! Quiero hacer el siguiente pedido:\n*Pedido #123*")).toBe(true);
  });

  it("uses the prices and totals stored by the server instead of the cart ones", () => {
    const cart = items.map((i) => ({ ...i, retailPrice: 5, wholesalePrice: 4 }));
    const msg = buildOrderMessage(cart, baForm, 1000, saved);
    expect(msg).toContain("*PEDIDO MAYORISTA* (123 unidades)");
    expect(msg).toContain("Presentación Cajón — $ 1.000 c/u = $ 2.000");
    expect(msg).toContain("_(a pedido)_ — $ 8 c/u = $ 960");
    expect(msg).toContain("Presentación Maple — precio a consultar");
    expect(msg).toContain("*Total parcial: $ 2.960* (precios mayoristas)");
  });

  it("omits prices when the server priced nothing", () => {
    const unpriced = { ...saved, isWholesale: false, total: 0, items: saved.items.map((i) => ({ ...i, unitPrice: null, subtotal: null })) };
    const msg = buildOrderMessage(items, baForm, 100, unpriced);
    expect(msg).toContain("*Pedido #123*");
    expect(msg).not.toMatch(/\$|precio|consultar/i);
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
    const msg = buildVariantMessage("Huevos N°1", "Presentación Cajón");
    expect(msg).toContain("• Huevos N°1 — Presentación Cajón");
    expect(msg).not.toMatch(/\$|precio/i);
  });
});

describe("buildWholesaleMessage", () => {
  it("mentions the wholesale threshold only when there is one", () => {
    expect(buildWholesaleMessage(100)).toContain("pedidos desde 100 unidades");
    expect(buildWholesaleMessage(0)).not.toContain("desde");
  });
});
