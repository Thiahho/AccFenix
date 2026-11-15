"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderIcon, ShoppingBagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sectionLinks, useActiveSection } from "@/lib/nav";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";
import { useCart } from "@/stores/cart";

type Props = { categories: { id: number; name: string; slug: string }[] };

/** Stagger index for the menu items slide-in (see `.menu-item-in` in globals.css). */
const stagger = (i: number) => ({ "--i": i }) as CSSProperties;

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
        variant="ghost"
        className="header-action rounded-full"
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
          <button type="button" tabIndex={-1} aria-hidden onClick={close} className="pointer-events-auto absolute inset-x-0 top-(--menu-top) h-dvh cursor-default bg-black/30 motion-safe:animate-in motion-safe:fade-in" />
          <nav
            ref={navRef}
            id="menu-movil"
            aria-label="Menú"
            className="pointer-events-auto absolute inset-x-3 top-(--menu-top) max-h-[calc(100dvh-var(--menu-top)-0.75rem)] overflow-y-auto rounded-2xl border bg-background px-3 pt-2 pb-4 shadow-xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-200"
          >
            <ul>
              {sectionLinks.map((s, i) => (
                <li key={s.id} className="menu-item-in" style={stagger(i)}>
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
                  {categories.map((c, i) => (
                    <li key={c.id} className="menu-item-in" style={stagger(sectionLinks.length + i)}>
                      <Link href={`/catalogo/${c.slug}`} onClick={close} className={cn(rowClass, "text-foreground hover:bg-muted")}>
                        <FolderIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="menu-item-in mt-3 border-t pt-3" style={stagger(sectionLinks.length + categories.length)}>
              <Link href="/pedido" onClick={close} className={cn(rowClass, "font-medium text-foreground hover:bg-muted")}>
                <ShoppingBagIcon aria-hidden className="size-5 shrink-0" />
                Mi pedido
                {lines > 0 && (
                  <span className="ml-auto rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-brand-foreground tabular-nums">
                    {lines}
                    <span className="sr-only"> {lines === 1 ? "producto" : "productos"}</span>
                  </span>
                )}
              </Link>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
