"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderIcon, MenuIcon, ShoppingBagIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sectionLinks, useActiveSection } from "@/lib/nav";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";
import { totalUnits, useCart } from "@/stores/cart";

type Props = { categories: { id: number; name: string; slug: string }[] };

const rowClass =
  "flex min-h-12 items-center gap-3 rounded-lg px-3 text-base transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/** Botón burger + panel desplegable para mobile. Se cierra al elegir un enlace, cambiar de ruta, con Escape o tocando fuera. */
export function MobileMenu({ categories }: Props) {
  const pathname = usePathname();
  const active = useActiveSection(pathname);
  // Guardamos en qué ruta se abrió: al navegar, el menú deja de estar abierto sin necesitar un efecto.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hydrated = useHydrated();
  const items = useCart((s) => s.items);
  const units = hydrated ? totalUnits(items) : 0;

  const close = () => setOpenedAt(null);

  useEffect(() => {
    if (!open) return;
    const button = buttonRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenedAt(null);
        button?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        size="icon"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        aria-controls="menu-movil"
        onClick={() => setOpenedAt(open ? null : pathname)}
      >
        {open ? <XIcon aria-hidden /> : <MenuIcon aria-hidden />}
      </Button>

      {open && (
        <>
          <button type="button" tabIndex={-1} aria-hidden onClick={close} className="absolute inset-x-0 top-full h-dvh cursor-default bg-black/30 motion-safe:animate-in motion-safe:fade-in" />
          <nav
            id="menu-movil"
            aria-label="Menú"
            className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b bg-background px-3 pt-2 pb-4 shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-200"
          >
            <ul>
              {sectionLinks.map((s) => (
                <li key={s.id}>
                  <Link
                    href={s.href}
                    onClick={close}
                    aria-current={active === s.id ? "true" : undefined}
                    className={cn(rowClass, active === s.id ? "bg-brand-soft font-medium text-brand" : "text-foreground hover:bg-muted")}
                  >
                    <s.icon aria-hidden className="size-5 shrink-0" />
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>

            {categories.length > 0 && (
              <>
                <p className="mt-3 mb-1 border-t px-3 pt-4 text-sm font-medium text-muted-foreground">Catálogos</p>
                <ul>
                  {categories.map((c) => (
                    <li key={c.id}>
                      <Link href={`/catalogo/${c.slug}`} onClick={close} className={cn(rowClass, "text-foreground hover:bg-muted")}>
                        <FolderIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="mt-3 border-t pt-3">
              <Link href="/pedido" onClick={close} className={cn(rowClass, "font-medium text-foreground hover:bg-muted")}>
                <ShoppingBagIcon aria-hidden className="size-5 shrink-0" />
                Mi pedido
                {units > 0 && (
                  <span className="ml-auto rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-brand-foreground tabular-nums">{units}</span>
                )}
              </Link>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
