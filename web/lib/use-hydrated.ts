"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** true solo en el cliente, después de hidratar. Evita desajustes SSR con datos de localStorage. */
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}
