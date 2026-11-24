"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Availability, VariantStatus } from "@/lib/api";

export const CART_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export type CartAddon = { id: number; label: string; price: number };

export type CartItem = {
  variantId: number;
  productSlug: string;
  productName: string;
  categoryName: string;
  /** Descripción legible de la variante, p. ej. "Calibre N°1 · Presentación Cajón". */
  valuesLabel: string;
  availability: Availability;
  /**
   * Last known prices in ARS. They are a snapshot: `sync` replaces them with the current ones.
   * Missing (older persisted carts) or null means the variant has no price.
   */
  retailPrice?: number | null;
  /** Chosen extras; their prices are refreshed by `sync` too. */
  addons?: CartAddon[];
  qty: number;
};

/** The same variant with different extras is a different line. */
export function cartLineKey(item: Pick<CartItem, "variantId" | "addons">) {
  return `${item.variantId}:${(item.addons ?? []).map((a) => a.id).sort((a, b) => a - b).join("-")}`;
}

type CartState = {
  items: CartItem[];
  savedAt: number;
  add: (item: Omit<CartItem, "qty">, qty: number) => void;
  setQty: (lineKey: string, qty: number) => void;
  remove: (lineKey: string) => void;
  clear: () => void;
  /** Aplica el estado actual de las variantes: quita las inactivas o inexistentes y refresca disponibilidad y precios. */
  sync: (statuses: VariantStatus[]) => void;
};

export function isExpired(savedAt: number, now = Date.now(), ttl = CART_TTL_MS) {
  return !savedAt || now - savedAt > ttl;
}

export function applyStatuses(items: CartItem[], statuses: VariantStatus[]): CartItem[] {
  const byId = new Map(statuses.map((s) => [s.id, s]));
  return items.flatMap((item) => {
    const status = byId.get(item.variantId);
    if (!status?.isActive) return [];
    // A line whose extra is no longer offered leaves the cart rather than silently changing what was ordered.
    const addons = item.addons?.map((addon) => ({ ...addon, price: status.addons?.find((a) => a.id === addon.id)?.price ?? -1 }));
    if (addons?.some((a) => a.price < 0)) return [];
    // Prices always come from the fresh data, never from what was stored when the item was added.
    return [{ ...item, ...(addons ? { addons } : {}), availability: status.availability, retailPrice: status.retailPrice ?? null }];
  });
}

export const MAX_QTY = 99999;

const clampQty = (qty: number) => Math.min(MAX_QTY, Math.max(1, Math.floor(qty) || 1));

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      savedAt: 0,
      add: (item, qty) =>
        set((s) => {
          const key = cartLineKey(item);
          const existing = s.items.find((i) => cartLineKey(i) === key);
          const items = existing
            ? s.items.map((i) => (cartLineKey(i) === key ? { ...i, ...item, qty: clampQty(i.qty + qty) } : i))
            : [...s.items, { ...item, qty: clampQty(qty) }];
          return { items, savedAt: Date.now() };
        }),
      setQty: (lineKey, qty) =>
        set((s) => ({
          items: s.items.map((i) => (cartLineKey(i) === lineKey ? { ...i, qty: clampQty(qty) } : i)),
          savedAt: Date.now(),
        })),
      remove: (lineKey) =>
        set((s) => ({ items: s.items.filter((i) => cartLineKey(i) !== lineKey), savedAt: Date.now() })),
      clear: () => set({ items: [], savedAt: 0 }),
      sync: (statuses) => set((s) => ({ items: applyStatuses(s.items, statuses) })),
    }),
    {
      name: "coldcup-cart",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items, savedAt: s.savedAt }),
      // Descarta carritos viejos al leerlos del navegador.
      merge: (persisted, current) => {
        const p = persisted as Partial<CartState> | undefined;
        if (!p || isExpired(p.savedAt ?? 0)) return current;
        return { ...current, items: p.items ?? [], savedAt: p.savedAt ?? 0 };
      },
    },
  ),
);

export const totalUnits = (items: CartItem[]) => items.reduce((sum, i) => sum + i.qty, 0);
