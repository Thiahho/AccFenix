"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Pixels the on-screen keyboard hides at the bottom of the layout viewport: the gap between the layout viewport's
 * bottom edge and the visual viewport's. Zero where the browser already resizes the layout for the keyboard.
 */
export function keyboardInset(layoutHeight: number, visualHeight: number, visualOffsetTop: number): number {
  return Math.max(0, Math.round(layoutHeight - visualHeight - visualOffsetTop));
}

function currentInset(): number {
  const vv = window.visualViewport;
  return vv ? keyboardInset(window.innerHeight, vv.height, vv.offsetTop) : 0;
}

/**
 * Live keyboard inset while `enabled` (e.g. while a bottom sheet is open), so fixed UI can sit above the keyboard on
 * browsers that overlay it instead of resizing the page (iOS Safari). Zero on the server and when disabled.
 */
export function useKeyboardInset(enabled: boolean): number {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const vv = window.visualViewport;
      if (!enabled || !vv) return () => {};
      vv.addEventListener("resize", onChange);
      vv.addEventListener("scroll", onChange);
      return () => {
        vv.removeEventListener("resize", onChange);
        vv.removeEventListener("scroll", onChange);
      };
    },
    [enabled],
  );
  return useSyncExternalStore(subscribe, () => (enabled ? currentInset() : 0), () => 0);
}
