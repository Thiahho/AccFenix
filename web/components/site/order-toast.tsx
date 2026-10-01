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
    <div data-order-toast className="group relative w-[var(--width)] font-sans text-ivory max-[600px]:w-full">
      <span aria-hidden className="absolute -top-1.5 right-13 hidden size-4 rotate-45 rounded-[3px] bg-navy md:block" />
      <div className="relative overflow-hidden rounded-2xl bg-navy shadow-[0_28px_64px_rgb(22_35_61/0.38),0_2px_8px_rgb(22_35_61/0.24)]">
        <div className="flex items-center gap-4 py-4 pr-14 pl-4">
          <div className="relative size-17 shrink-0">
            <div className="relative grid size-full place-items-center overflow-hidden rounded-xl bg-ivory">
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt="" fill sizes="68px" className="object-cover" />
              ) : (
                <RodMark color={item.colorHex ?? "var(--brass)"} />
              )}
            </div>
            <span className="absolute -right-1.5 -bottom-1.5 grid size-6.5 place-items-center rounded-full border-[3px] border-navy bg-[#1f8a52] text-white">
              <CheckIcon aria-hidden className="size-3" strokeWidth={3.5} />
            </span>
          </div>

          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-brass-light">SUMADO A TU PEDIDO</p>
            <p className="font-serif text-3xl leading-none font-medium">{item.title}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-ivory/80">
              {item.colorHex && <span aria-hidden className="size-3 rounded-full border border-ivory/50" style={{ backgroundColor: item.colorHex }} />}
              <span>{item.detail}</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2 text-xs font-medium",
                  available ? "border-[#9fe0b9]/45 text-[#9fe0b9]" : "border-[#f2cd7e]/45 text-[#f2cd7e]",
                )}
              >
                <span aria-hidden className={cn("size-1.5 rounded-full", available ? "bg-[#9fe0b9]" : "bg-[#f2cd7e]")} />
                {availabilityLabel[item.availability]}
              </span>
            </p>
          </div>

          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={close}
            className="absolute top-1 right-1 grid size-11 place-items-center rounded-full text-ivory/80 transition-colors hover:text-ivory focus-visible:ring-2 focus-visible:ring-brass-light focus-visible:outline-none"
          >
            <XIcon aria-hidden className="size-4.5" />
          </button>
        </div>

        <div className="flex gap-2.5 border-t border-ivory/15 px-4 pt-3 pb-4">
          <button
            type="button"
            onClick={close}
            className="h-12 flex-1 rounded-full border border-ivory/40 text-[15px] font-medium transition-colors hover:bg-ivory/10 focus-visible:ring-2 focus-visible:ring-brass-light focus-visible:outline-none sm:h-11"
          >
            Seguir eligiendo
          </button>
          <Link
            href="/pedido"
            onClick={close}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-ivory text-[15px] font-semibold text-navy transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-brass-light focus-visible:outline-none sm:h-11"
          >
            Ver pedido
            <span className="grid h-5.5 min-w-5.5 place-items-center rounded-full bg-navy px-1.5 text-xs text-ivory tabular-nums">{lines}</span>
            <ArrowRightIcon aria-hidden className="size-4" />
          </Link>
        </div>

        <div aria-hidden className="h-[3px] bg-ivory/10">
          <div className="order-toast-progress h-full bg-brass-light" style={{ animationDuration: `${DURATION_MS}ms` }} />
        </div>
      </div>
    </div>
  );
}

/** Barral dibujado en el color elegido, para cuando el producto todavía no tiene foto. */
function RodMark({ color }: { color: string }) {
  return (
    <span aria-hidden className="flex w-3/4 -rotate-[24deg] items-center">
      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="-mx-0.5 h-1.5 flex-1" style={{ backgroundColor: color }} />
      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
    </span>
  );
}
