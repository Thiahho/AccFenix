"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CartButton } from "@/components/site/cart-button";
import { MobileMenu } from "@/components/site/mobile-menu";
import { Wordmark } from "@/components/site/wordmark";
import { sectionLinks, useActiveSection, useHeaderScroll } from "@/lib/nav";
import { site } from "@/lib/site";

type Category = { id: number; name: string; slug: string };

/** Home sections shown on desktop ("Inicio" is the wordmark itself). */
const desktopSections = sectionLinks.slice(1);

/** Stagger index for the load-in animation (see `.header-item` in globals.css). */
const stagger = (i: number) => ({ "--i": i }) as CSSProperties;

const linkClass =
  "nav-link header-item relative z-10 rounded-full px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:text-brand focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&[aria-current]]:text-brand";

/**
 * Public sticky header: airy at the top, compact and solid once the page scrolls, hides while scrolling down
 * and comes back on the way up. Motion lives in globals.css (`.site-header*`) and respects reduced motion.
 */
export function SiteHeader({ categories }: { categories: Category[] }) {
  const pathname = usePathname();
  const active = useActiveSection(pathname);
  const { compact, hidden } = useHeaderScroll();
  const navRef = useRef<HTMLElement>(null);
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
    <header data-compact={compact || undefined} data-hidden={hidden || undefined} className="site-header pointer-events-none sticky top-0 z-40 h-16">
      <div aria-hidden className="site-header-bg absolute inset-x-0 top-0 h-16" />
      <div className="site-header-bar pointer-events-auto relative mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 lg:gap-6">
        <Link
          href="/"
          aria-label={`${site.name} — inicio`}
          style={stagger(0)}
          className="header-item group flex min-h-11 items-center rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="site-header-logo inline-block">
            <Wordmark className="wordmark-wobble inline-block text-4xl" />
          </span>
        </Link>

        <nav ref={navRef} aria-label="Secciones" className="relative hidden flex-1 items-center text-sm md:flex">
          <span ref={indicatorRef} aria-hidden data-visible="false" className="nav-indicator absolute top-1/2 left-0 h-8 rounded-full bg-brand-soft" />
          {desktopSections.map((s, i) => (
            <Link
              key={s.id}
              href={s.href}
              data-section={s.id}
              aria-current={active === s.id ? "true" : undefined}
              style={stagger(i + 1)}
              className={linkClass}
            >
              {s.label}
            </Link>
          ))}
          {categories.length > 0 && <span aria-hidden className="header-item mx-2 h-4 w-px bg-border" style={stagger(desktopSections.length + 1)} />}
          {categories.map((c, i) => {
            const href = `/catalogo/${c.slug}`;
            return (
              <Link
                key={c.id}
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                style={stagger(desktopSections.length + 2 + i)}
                className={linkClass}
              >
                {c.name}
              </Link>
            );
          })}
        </nav>

        <div className="header-item ml-auto flex items-center gap-2 md:ml-0" style={stagger(desktopSections.length + categories.length + 2)}>
          <CartButton />
          <MobileMenu categories={categories} />
        </div>
      </div>
    </header>
  );
}
