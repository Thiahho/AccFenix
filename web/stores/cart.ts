"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Availability, VariantStatus } from "@/lib/api";

export const CART_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export type CartItem = {
  variantId: number;
  productSlug: string;
  productName: string;
  categoryName: string;
  /** Descripción legible de la variante, p. ej. "Medida 2.40 · Grosor 34 · Color Caoba". */
  valuesLabel: string;
  availability: Availability;
  qty: number;
};

type CartState = {
  items: CartItem[];
  savedAt: number;
  add: (item: Omit<CartItem, "qty">, qty: number) => void;
  setQty: (variantId: number, qty: number) => void;
  remove: (variantId: number) => void;
  clear: () => void;
  /** Aplica el estado actual de las variantes: quita las inactivas o inexistentes y refresca la disponibilidad. */
  sync: (statuses: VariantStatus[]) => void;
};

export function isExpired(savedAt: number, now = Date.now(), ttl = CART_TTL_MS) {
  return !savedAt || now - savedAt > ttl;
}

export function applyStatuses(items: CartItem[], statuses: VariantStatus[]): CartItem[] {
  const byId = new Map(statuses.map((s) => [s.id, s]));
  return items.flatMap((item) => {
    const status = byId.get(item.variantId);
    return status?.isActive ? [{ ...item, availability: status.availability }] : [];
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
          const existing = s.items.find((i) => i.variantId === item.variantId);
          const items = existing
            ? s.items.map((i) => (i.variantId === item.variantId ? { ...i, ...item, qty: clampQty(i.qty + qty) } : i))
            : [...s.items, { ...item, qty: clampQty(qty) }];
          return { items, savedAt: Date.now() };
        }),
      setQty: (variantId, qty) =>
        set((s) => ({
          items: s.items.map((i) => (i.variantId === variantId ? { ...i, qty: clampQty(qty) } : i)),
          savedAt: Date.now(),
        })),
      remove: (variantId) =>
        set((s) => ({ items: s.items.filter((i) => i.variantId !== variantId), savedAt: Date.now() })),
      clear: () => set({ items: [], savedAt: 0 }),
      sync: (statuses) => set((s) => ({ items: applyStatuses(s.items, statuses) })),
    }),
    {
      name: "accfenix-cart",
      version: 1,
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
