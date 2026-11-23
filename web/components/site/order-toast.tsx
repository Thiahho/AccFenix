"use client";

import Image from "next/image";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import { ArrowRightIcon, CheckIcon, XIcon } from "lucide-react";
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
    <div data-order-toast className="group relative w-[var(--width)] font-sans text-cream max-[600px]:w-full">
      <span aria-hidden className="absolute -top-1.5 right-13 hidden size-4 rotate-45 rounded-[3px] bg-espresso md:block" />
      <div className="relative overflow-hidden rounded-2xl bg-espresso shadow-[0_28px_64px_rgb(30_18_10/0.38),0_2px_8px_rgb(30_18_10/0.24)]">
        <div className="flex items-center gap-4 py-4 pr-14 pl-4">
          <div className="relative size-17 shrink-0">
            <div className="relative grid size-full place-items-center overflow-hidden rounded-xl bg-cream">
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt="" fill sizes="68px" className="object-cover" />
              ) : (
                <EggMark />
              )}
            </div>
            <span className="absolute -right-1.5 -bottom-1.5 grid size-6.5 place-items-center rounded-full border-[3px] border-espresso bg-status-ok-strong text-white">
              <CheckIcon aria-hidden className="size-3" strokeWidth={3.5} />
            </span>
          </div>

          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-latte">SUMADO A TU PEDIDO</p>
            <p className="font-heading text-2xl leading-none font-extrabold uppercase">{item.title}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-cream/80">
              {item.colorHex && <span aria-hidden className="size-3 rounded-full border border-cream/50" style={{ backgroundColor: item.colorHex }} />}
              <span>{item.detail}</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2 text-xs font-medium",
                  available ? "border-status-ok/45 text-status-ok" : "border-status-warn/45 text-status-warn",
                )}
              >
                <span aria-hidden className={cn("size-1.5 rounded-full", available ? "bg-status-ok" : "bg-status-warn")} />
                {availabilityLabel[item.availability]}
              </span>
            </p>
          </div>

          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={close}
            className="absolute top-1 right-1 grid size-11 place-items-center rounded-full text-cream/80 transition-colors hover:text-cream focus-visible:ring-2 focus-visible:ring-latte focus-visible:outline-none"
          >
            <XIcon aria-hidden className="size-4.5" />
          </button>
        </div>

        <div className="flex gap-2.5 border-t border-cream/15 px-4 pt-3 pb-4">
          <button
            type="button"
            onClick={close}
            className="h-12 flex-1 rounded-full border border-cream/40 text-[15px] font-medium transition-colors hover:bg-cream/10 focus-visible:ring-2 focus-visible:ring-latte focus-visible:outline-none sm:h-11"
          >
            Seguir eligiendo
          </button>
          <Link
            href="/pedido"
            onClick={close}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-cream text-[15px] font-semibold text-espresso transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-latte focus-visible:outline-none sm:h-11"
          >
            Ver pedido
            <span className="grid h-5.5 min-w-5.5 place-items-center rounded-full bg-espresso px-1.5 text-xs text-cream tabular-nums">{lines}</span>
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

/** Drawn egg, for products that have no photo yet. */
function EggMark() {
  return <span aria-hidden className="block h-11 w-8.5 rounded-[50%_50%_50%_50%/60%_60%_40%_40%] bg-[radial-gradient(circle_at_35%_30%,#fffaf0,#efdcbc_70%,#d9bf95)] shadow-[0_4px_10px_rgb(0_0_0/0.18)]" />;
}
