"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CartButton } from "@/components/site/cart-button";
import { MobileMenu } from "@/components/site/mobile-menu";
import { Wordmark } from "@/components/site/wordmark";
import { sectionLinks, useActiveSection, useHeaderCompact } from "@/lib/nav";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

type Category = { id: number; name: string; slug: string };

/** Home sections shown on desktop ("Inicio" is the wordmark itself). */
const desktopSections = sectionLinks.slice(1);

/** Stagger index for the load-in animation (see `.header-item` in globals.css). */
const stagger = (i: number) => ({ "--i": i }) as CSSProperties;

const linkClass =
  "nav-link relative z-10 rounded-full px-3 py-1.5 font-medium text-cream/80 transition-colors hover:text-cream focus-visible:ring-2 focus-visible:ring-latte focus-visible:outline-none [&[aria-current]]:text-brand-foreground";

/**
 * Public sticky header with no bar background: the wordmark, the section links and the actions float in their
 * own capsules, always visible, and shrink a little once the page scrolls. On the home it overlays the hero.
 * Motion lives in globals.css (`.site-header*`, `.header-capsule`) and respects reduced motion.
 */
export function SiteHeader({ categories }: { categories: Category[] }) {
  const pathname = usePathname();
  const active = useActiveSection(pathname);
  const compact = useHeaderCompact();
  const navRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);

  // Slides the pill under the active section link; measured from the DOM, so no re-render per frame.
  useLayoutEffect(() => {
    const nav = navRef.current;
    const indicator = indicatorRef.current;
    if (!nav || !indicator) return;
    const place = () => {
      const link = active ? nav.querySelector<HTMLElement>(`[data-section="${active}"]`) : null;
      if (!link || link.offsetWidth === 0) {
        indicator.dataset.visible = "false";
        return;
      }
      // Coming from hidden: jump into place instead of sliding in from the last spot.
      const wasHidden = indicator.dataset.visible !== "true";
      if (wasHidden) indicator.style.transition = "none";
      indicator.style.setProperty("--x", `${link.offsetLeft}px`);
      indicator.style.setProperty("--w", `${link.offsetWidth}px`);
      indicator.dataset.visible = "true";
      if (wasHidden) {
        void indicator.offsetWidth; // Commit the jump before restoring transitions.
        indicator.style.transition = "";
      }
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [active]);

  return (
    <header
      data-compact={compact || undefined}
      // On the home the hero runs under the floating capsules; elsewhere the header keeps its own row.
      className={cn("site-header pointer-events-none sticky top-0 z-40 h-16", pathname === "/" && "-mb-16")}
    >
      <div className="site-header-bar relative mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link
          href="/"
          aria-label={`${site.name} — inicio`}
          style={stagger(0)}
          className="header-item header-capsule group pointer-events-auto flex h-11 items-center rounded-full bg-brand px-4 focus-visible:ring-3 focus-visible:ring-latte focus-visible:outline-none"
        >
          <Wordmark tone="light" className="wordmark-wobble inline-block text-3xl leading-none" />
        </Link>

        <nav aria-label="Secciones" className="mx-auto hidden md:block">
          <div
            ref={navRef}
            style={stagger(1)}
            className="header-item header-capsule pointer-events-auto relative flex items-center rounded-full bg-espresso/95 p-1 text-sm backdrop-blur-md"
          >
            <span ref={indicatorRef} aria-hidden data-visible="false" className="nav-indicator absolute top-1/2 left-0 h-8 rounded-full bg-caramel-deep" />
            {desktopSections.map((s) => (
              <Link key={s.id} href={s.href} data-section={s.id} aria-current={active === s.id ? "true" : undefined} className={linkClass}>
                {s.label}
              </Link>
            ))}
            {categories.length > 0 && <span aria-hidden className="mx-1.5 h-4 w-px bg-cream/25" />}
            {categories.map((c) => {
              const href = `/catalogo/${c.slug}`;
              return (
                <Link key={c.id} href={href} aria-current={pathname === href ? "page" : undefined} className={cn(linkClass, "[&[aria-current]]:text-latte")}>
                  {c.name}
                </Link>
              );
            })}
          </div>
        </nav>

        <div
          style={stagger(2)}
          className="header-item header-capsule pointer-events-auto ml-auto flex items-center gap-1 rounded-full bg-espresso/95 p-1 md:ml-0"
        >
          <CartButton />
          <MobileMenu categories={categories} />
        </div>
      </div>
    </header>
  );
}
