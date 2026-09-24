import { describe, expect, it } from "vitest";
import type { OrderForm } from "@/lib/order";
import { buildOrderMessage, isWholesale, whatsappUrl } from "@/lib/whatsapp";
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

  it("never mentions prices", () => {
    expect(buildOrderMessage(items, baForm, 100)).not.toMatch(/\$|precio/i);
  });
});

describe("whatsappUrl", () => {
  it("strips non-digits and encodes the text", () => {
    expect(whatsappUrl("+54 9 11 1234-5678", "Hola & chau")).toBe("https://wa.me/5491112345678?text=Hola%20%26%20chau");
  });
});
