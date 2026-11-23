"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { categorySection, sectionLinks, useActiveSection } from "@/lib/nav";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";
import { useCart } from "@/stores/cart";

type Props = { categories: { id: number; name: string; slug: string }[] };

const rowClass =
  "poster-display poster-focus-inset flex min-h-14 items-center justify-between gap-3 border-b-2 border-espresso px-4 text-2xl transition-colors";

/** Botón burger + panel desplegable para mobile. Se cierra al elegir un enlace, cambiar de ruta, con Escape, tocando fuera o al pasar a desktop. */
export function MobileMenu({ categories }: Props) {
  const pathname = usePathname();
  const active = useActiveSection(pathname);
  // Guardamos en qué ruta se abrió: al navegar, el menú deja de estar abierto sin necesitar un efecto.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const hydrated = useHydrated();
  const items = useCart((s) => s.items);
  // Same count as the header cart badge (products, not units) so both never disagree.
  const lines = hydrated ? items.length : 0;

  const close = () => setOpenedAt(null);

  useEffect(() => {
    if (!open) return;
    const button = buttonRef.current;
    // Focus cycle while open: the toggle (it closes the menu) plus every link in the panel.
    const focusables = () => [button, ...(navRef.current?.querySelectorAll<HTMLElement>("a[href]") ?? [])].filter((el) => el != null);
    focusables()[1]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenedAt(null);
        button?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      const inside = items.includes(document.activeElement as HTMLElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    // The wrapper is `md:hidden`: if the viewport grows past it while open, close so the focus trap and the scroll
    // lock do not outlive the hidden panel. The cleanup below restores scroll; focus is left where it is.
    const desktop = window.matchMedia("(min-width: 768px)");
    const onDesktop = (e: MediaQueryListEvent) => {
      if (e.matches) setOpenedAt(null);
    };
    desktop.addEventListener("change", onDesktop);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onDesktop);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <div className="flex md:hidden">
      <Button
        ref={buttonRef}
        type="button"
        variant="ghost"
        className="poster-focus-inset h-full w-14 rounded-none border-l-[3px] border-l-espresso hover:bg-oat aria-expanded:bg-oat"
        size="icon"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        aria-controls="menu-movil"
        onClick={() => setOpenedAt(open ? null : pathname)}
      >
        {/* Three bars that morph into an X (see `.burger` in globals.css). */}
        <span aria-hidden data-open={open || undefined} className="burger">
          <span />
          <span />
          <span />
        </span>
      </Button>

      {open && (
        <>
          <button type="button" tabIndex={-1} aria-hidden onClick={close} className="absolute inset-x-0 top-full h-dvh cursor-default bg-roast/60" />
          <nav
            ref={navRef}
            id="menu-movil"
            aria-label="Menú"
            className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem-3px)] overflow-y-auto border-b-[3px] border-espresso bg-ivory"
          >
            <ul>
              {sectionLinks.map((s) => (
                <li key={s.id}>
                  <Link
                    href={s.href}
                    onClick={close}
                    aria-current={active === s.id ? "true" : undefined}
                    className={cn(rowClass, active === s.id ? "bg-espresso text-ivory" : "hover:bg-oat")}
                  >
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>

            {categories.length > 0 && (
              <>
                <p className="poster-label bg-latte px-4 py-2 text-espresso">Catálogos</p>
                <ul>
                  {categories.map((c) => {
                    const current = active === categorySection(c.slug);
                    return (
                      <li key={c.id}>
                        <Link
                          href={`/catalogo/${c.slug}`}
                          onClick={close}
                          aria-current={current ? "page" : undefined}
                          className={cn(rowClass, current ? "bg-espresso text-ivory" : "hover:bg-oat")}
                        >
                          {c.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            <Link href="/pedido" onClick={close} className={cn(rowClass, "border-b-0 bg-caramel-deep text-ivory hover:bg-espresso")}>
              Mi pedido
              {lines > 0 && (
                <span className="bg-ivory px-2 py-1 text-sm tracking-normal text-espresso tabular-nums">
                  {lines}
                  <span className="sr-only"> {lines === 1 ? "producto" : "productos"}</span>
                </span>
              )}
            </Link>
          </nav>
        </>
      )}
    </div>
  );
}
