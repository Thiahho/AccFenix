"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { create } from "zustand";
import { ArrowRightIcon, CheckIcon, CupSodaIcon, XIcon } from "lucide-react";
import { availabilityLabel, type Availability } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useCart } from "@/stores/cart";

const DURATION_MS = 6000;

export type AddedItem = {
  title: string;
  detail: string;
  availability: Availability;
  imageUrl?: string | null;
  colorHex?: string | null;
};

type Notice = { key: number; item: AddedItem };

/*
 * The notice lives in its own store instead of sonner: sonner adds toasts from a setTimeout and only shows them after a
 * mount effect, which some phones delayed until the page lost visibility (the notice appeared only after switching
 * windows). Setting this state inside the tap handler renders the notice in the same commit as the cart update.
 */
const useAddedNotice = create<{ notice: Notice | null; hide: () => void }>((set) => ({
  notice: null,
  hide: () => set({ notice: null }),
}));

/** Aviso de "sumado al pedido": arriba a la derecha bajo el botón Mi pedido; en móvil, abajo a todo el ancho. */
export function notifyAdded(item: AddedItem) {
  useAddedNotice.setState((s) => ({ notice: { key: (s.notice?.key ?? 0) + 1, item } }));
}

/**
 * Contenedor del aviso de pedido. The live region is always mounted so screen readers announce each new notice. It closes
 * by itself after DURATION_MS (paused while hovered or focused, like the progress bar), with Escape or its buttons.
 */
export function OrderToaster() {
  const notice = useAddedNotice((s) => s.notice);
  const hide = useAddedNotice((s) => s.hide);
  const [paused, setPaused] = useState(false);
  const remaining = useRef(DURATION_MS);
  const startedAt = useRef(0);

  // A new notice restarts the countdown.
  useEffect(() => {
    remaining.current = DURATION_MS;
  }, [notice?.key]);

  useEffect(() => {
    if (!notice || paused) return;
    startedAt.current = Date.now();
    const timer = window.setTimeout(hide, remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
    };
  }, [notice, paused, hide]);

  useEffect(() => {
    if (!notice) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hide();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [notice, hide]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Avisos del pedido"
      // Phones: pinned to the bottom, full width. From 601px: under the header, aligned with its container's right edge.
      className="pointer-events-none fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-[60] min-[601px]:inset-x-auto min-[601px]:top-[4.75rem] min-[601px]:right-[max(1rem,calc((100vw-72rem)/2+1rem))] min-[601px]:bottom-auto"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
    >
      {notice && <OrderToast key={notice.key} item={notice.item} close={hide} />}
    </div>
  );
}

function OrderToast({ item, close }: { item: AddedItem; close: () => void }) {
  const lines = useCart((s) => s.items.length);
  const available = item.availability === "disponible";

  return (
    <div data-order-toast className="order-toast-in group pointer-events-auto relative w-[440px] text-cream max-[600px]:w-full">
      <div className="poster-ink relative overflow-hidden border border-ivory">
        <div className="flex items-center gap-4 py-4 pr-14 pl-4">
          <div className="relative size-17 shrink-0">
            <div className="relative grid size-full place-items-center overflow-hidden bg-cream">
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt="" fill sizes="68px" className="object-cover" />
              ) : (
                <CupSodaIcon aria-hidden className="size-8 text-espresso" />
              )}
            </div>
            <span className="absolute -right-1.5 -bottom-1.5 grid size-6.5 place-items-center border border-border bg-status-ok-strong text-white">
              <CheckIcon aria-hidden className="size-3" strokeWidth={3.5} />
            </span>
          </div>

          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-latte">SUMADO A TU PEDIDO</p>
            <p className="poster-display text-xl leading-[1.2]">{item.title}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-cream/80">
              {item.colorHex && <span aria-hidden className="size-3 border border-cream/50" style={{ backgroundColor: item.colorHex }} />}
              <span>{item.detail}</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 border px-2 text-xs font-bold",
                  available ? "border-status-ok/45 text-status-ok" : "border-status-warn/45 text-status-warn",
                )}
              >
                <span aria-hidden className={cn("size-1.5", available ? "bg-status-ok" : "bg-status-warn")} />
                {availabilityLabel[item.availability]}
              </span>
            </p>
          </div>

          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={close}
            className="absolute top-1 right-1 poster-focus-inset grid size-11 place-items-center text-cream transition-colors hover:bg-roast"
          >
            <XIcon aria-hidden className="size-4.5" />
          </button>
        </div>

        <div className="flex gap-2.5 border-t border-cream/15 px-4 pt-3 pb-4">
          <button
            type="button"
            onClick={close}
            className="h-12 flex-1 border border-cream text-[15px] font-bold transition-colors hover:bg-roast"
          >
            Seguir eligiendo
          </button>
          <Link
            href="/pedido"
            onClick={close}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 bg-cream text-[15px] font-bold text-espresso transition-colors hover:bg-latte"
          >
            Ver pedido
            <span className="grid h-5.5 min-w-5.5 place-items-center bg-espresso px-1.5 text-xs text-cream tabular-nums">{lines}</span>
            <ArrowRightIcon aria-hidden className="size-4" />
          </Link>
        </div>

        <div aria-hidden className="h-[3px] bg-cream/10">
          <div className="order-toast-progress h-full bg-latte" style={{ animationDuration: `${DURATION_MS}ms` }} />
        </div>
      </div>
    </div>
  );
}

