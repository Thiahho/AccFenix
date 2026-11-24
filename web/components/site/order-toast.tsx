"use client";

import Image from "next/image";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import { ArrowRightIcon, CheckIcon, CupSodaIcon, XIcon } from "lucide-react";
import { availabilityLabel, type Availability } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useCart } from "@/stores/cart";

const TOASTER_ID = "pedido";
const DURATION_MS = 6000;

export type AddedItem = {
  title: string;
  detail: string;
  availability: Availability;
  imageUrl?: string | null;
  colorHex?: string | null;
};

let lastId: string | number | undefined;

/** Aviso de "sumado al pedido": arriba a la derecha bajo el botón Mi pedido; en móvil, abajo a todo el ancho. */
export function notifyAdded(item: AddedItem) {
  if (lastId !== undefined) toast.dismiss(lastId);
  // 600px es el corte en el que sonner pasa a su disposición móvil.
  const desktop = window.matchMedia("(min-width: 601px)").matches;
  lastId = toast.custom((id) => <OrderToast id={id} item={item} />, {
    toasterId: TOASTER_ID,
    duration: DURATION_MS,
    position: desktop ? "top-right" : "bottom-center",
  });
}

/** Contenedor propio del aviso de pedido; el resto de los toasts sigue usando el Toaster general. */
export function OrderToaster() {
  return (
    <Toaster
      id={TOASTER_ID}
      containerAriaLabel="Avisos del pedido"
      // Alineado con el borde derecho del contenedor del header (max-w-6xl + px-4).
      offset={{ top: "4.75rem", right: "max(1rem, calc((100vw - 72rem) / 2 + 1rem))" }}
      mobileOffset={{ bottom: "max(12px, env(safe-area-inset-bottom))", left: "12px", right: "12px" }}
      style={{ "--width": "440px" } as React.CSSProperties}
    />
  );
}

function OrderToast({ id, item }: { id: string | number; item: AddedItem }) {
  const lines = useCart((s) => s.items.length);
  const available = item.availability === "disponible";
  const close = () => toast.dismiss(id);

  return (
    <div data-order-toast className="group relative w-[var(--width)] text-cream max-[600px]:w-full">
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

