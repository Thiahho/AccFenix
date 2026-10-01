"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ChevronsDownIcon } from "lucide-react";

// Tela azul noche con pliegues, una raya fina y sombra arriba y abajo.
const drape = [
  "repeating-linear-gradient(90deg, transparent 0 23px, rgb(222 200 160 / 0.1) 23px 24px, transparent 24px 46px)",
  "linear-gradient(180deg, rgb(0 0 0 / 0.35) 0%, transparent 12%, transparent 80%, rgb(0 0 0 / 0.4) 100%)",
  "repeating-linear-gradient(90deg, #0e1729 0px, #1c2d4c 14px, #2f4a75 26px, #1c2d4c 38px, #0e1729 52px)",
].join(", ");

// La cortina termina de abrirse antes de que el escenario deje de estar fijo, así el hero se ve un momento completo.
const OPEN_AT = 0.85;

/**
 * Portada con cortina: el hero queda detrás de dos paños que se recogen hacia los costados al scrollear.
 * Con el mouse cerca del centro se entreabre. Con reduced-motion se muestra el hero sin cortina.
 * El progreso se escribe como variables CSS (--p, --open) para no re-renderizar en cada scroll.
 */
export function CurtainIntro({ children }: { children: React.ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const inner = innerRef.current;
    if (!stage || !inner) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      stage.dataset.state = "static";
      return;
    }

    let frame = 0;
    let peek = 0;
    const paint = () => {
      frame = 0;
      const travel = stage.offsetHeight - inner.offsetHeight;
      const scrolled = inner.getBoundingClientRect().top - stage.getBoundingClientRect().top;
      const p = travel > 0 ? Math.min(1, Math.max(0, scrolled / (travel * OPEN_AT))) : 1;
      stage.style.setProperty("--p", p.toFixed(4));
      stage.style.setProperty("--open", Math.max(p, peek).toFixed(4));
      stage.dataset.state = p > 0.25 ? "open" : "closed";
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || stage.dataset.state === "open") return;
      const r = inner.getBoundingClientRect();
      const d = Math.abs((e.clientX - r.left) / r.width - 0.5);
      peek = Math.max(0, 0.12 * (1 - d / 0.5));
      schedule();
    };
    const onLeave = () => {
      peek = 0;
      schedule();
    };

    paint();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    inner.addEventListener("pointermove", onMove);
    inner.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      inner.removeEventListener("pointermove", onMove);
      inner.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  /** Scrollea justo hasta donde la cortina queda abierta del todo. */
  function open() {
    const stage = stageRef.current;
    const inner = innerRef.current;
    if (!stage || !inner || stage.dataset.state !== "closed") return false;
    const travel = stage.offsetHeight - inner.offsetHeight;
    const stickyTop = parseFloat(getComputedStyle(inner).top) || 0;
    window.scrollBy({ top: stage.getBoundingClientRect().top - stickyTop + travel * OPEN_AT, behavior: "smooth" });
    return true;
  }

  return (
    <div
      ref={stageRef}
      data-state="closed"
      className="group relative h-[220svh] bg-ivory [--max:0.92] data-[state=static]:h-auto md:[--max:0.84]"
    >
      <div
        ref={innerRef}
        className="sticky top-16 h-[calc(100svh_-_4rem)] overflow-hidden group-data-[state=static]:static group-data-[state=static]:h-auto"
      >
        {/* Lo que hay detrás. Si el foco de teclado entra acá con la cortina cerrada, se abre. */}
        <div
          onFocus={open}
          className="h-full origin-[50%_60%] [transform:scale(calc(1.06_-_0.06*var(--p,0)))] group-data-[state=static]:transform-none"
        >
          {children}
        </div>

        <div aria-hidden className="group-data-[state=static]:hidden">
          <div className="absolute inset-x-0 top-0 z-[4] h-5 bg-gradient-to-b from-ivory to-ivory-deep" />
          <div className="absolute inset-x-3 top-3 z-[5] h-3 rounded-full bg-[linear-gradient(180deg,#e3c48c_0%,#b38a4f_45%,#7d5a2c_100%)] shadow-[0_4px_10px_rgb(0_0_0/0.25)]" />
          <div className="absolute top-1.5 left-0.5 z-[6] size-6 rounded-full bg-[radial-gradient(circle_at_35%_30%,#f0d69f,#a47a40_60%,#6b4a22)]" />
          <div className="absolute top-1.5 right-0.5 z-[6] size-6 rounded-full bg-[radial-gradient(circle_at_35%_30%,#f0d69f,#a47a40_60%,#6b4a22)]" />
          <div
            className="absolute top-5 bottom-0 left-0 z-[3] w-[calc(50%_+_16px)] origin-left [transform:scaleX(calc(1_-_var(--max)*var(--open,0)))] shadow-[inset_-18px_0_30px_rgb(0_0_0/0.35),12px_0_40px_rgb(0_0_0/0.25)] transition-transform duration-150 ease-linear"
            style={{ background: drape }}
          />
          <div
            className="absolute top-5 right-0 bottom-0 z-[3] w-[calc(50%_+_16px)] origin-right [transform:scaleX(calc(1_-_var(--max)*var(--open,0)))] shadow-[inset_18px_0_30px_rgb(0_0_0/0.35),-12px_0_40px_rgb(0_0_0/0.25)] transition-transform duration-150 ease-linear"
            style={{ background: drape }}
          />
        </div>

        {/* Bienvenida sobre la cortina: se desvanece mientras se abre. */}
        <div className="pointer-events-none absolute inset-0 z-[7] flex flex-col items-center justify-center px-5 group-data-[state=static]:hidden">
          <div className="pointer-events-auto flex w-full max-w-sm flex-col items-center gap-5 rounded-md bg-ivory/[0.97] px-8 py-9 text-center text-navy opacity-[max(0,calc(1_-_3*var(--p,0)))] shadow-[0_40px_80px_rgb(6_12_26/0.45)] [transform:translateY(calc(-160px*var(--p,0)))] group-data-[state=open]:pointer-events-none">
            <Image src="/logo-solo.png" alt="" width={64} height={64} className="size-16 object-contain" />
            <div className="flex flex-col gap-2">
              <p className="font-serif text-4xl leading-none font-medium">Bienvenido</p>
              <p className="text-sm text-pretty text-navy/70">Barrales de madera a la medida de cada ventana. Abrí la cortina para ver el catálogo.</p>
            </div>
            <a
              href="#catalogo"
              onClick={(e) => {
                if (open()) e.preventDefault();
              }}
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-navy text-[15px] font-semibold text-ivory transition-colors hover:bg-navy/90 focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
            >
              Abrir la cortina
            </a>
            <Link href="/admin/login" className="inline-flex min-h-11 items-center text-sm font-medium text-brand underline underline-offset-4 hover:text-brand/80">
              Acceso administradores
            </Link>
          </div>
          <div className="absolute bottom-8 flex flex-col items-center gap-2 text-[11px] font-semibold tracking-[0.34em] text-[#e9dcc3] opacity-[max(0,calc(1_-_3*var(--p,0)))]">
            DESLIZÁ PARA ABRIR
            <ChevronsDownIcon aria-hidden className="size-5 animate-bounce" />
          </div>
        </div>
      </div>
    </div>
  );
}
