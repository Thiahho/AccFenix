"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CartButton } from "@/components/site/cart-button";
import { MobileMenu } from "@/components/site/mobile-menu";
import { Wordmark } from "@/components/site/wordmark";
import { categorySection, sectionLinks, useActiveSection } from "@/lib/nav";
import { site } from "@/lib/site";

type Category = { id: number; name: string; slug: string };

/** Home sections shown on desktop ("Inicio" is the wordmark itself). */
const desktopSections = sectionLinks.slice(1);

const linkClass =
  "poster-focus-inset flex h-full items-center border-b-2 border-transparent px-2 text-xs font-semibold tracking-[0.08em] whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground lg:px-3 lg:text-[13px] aria-[current]:border-caramel-deep aria-[current]:text-foreground";

/** Translucent full-width bar. The mobile menu panel hangs from it, so the header is its containing block. */
export function SiteHeader({ categories }: { categories: Category[] }) {
  const pathname = usePathname();
  const active = useActiveSection(pathname);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 text-foreground backdrop-blur-md">
      <div className="flex h-16 items-stretch">
        <Link
          href="/"
          aria-label={`${site.name} — inicio`}
          className="poster-focus-inset flex shrink-0 items-center px-4 transition-opacity hover:opacity-80 lg:px-8"
        >
          <Wordmark className="text-2xl" />
        </Link>

        <nav aria-label="Secciones" className="hidden min-w-0 flex-1 md:block">
          <ul className="flex h-full items-stretch">
            {desktopSections.map((s) => (
              <li key={s.id}>
                <Link href={s.href} aria-current={active === s.id ? "true" : undefined} className={linkClass}>
                  {s.label}
                </Link>
              </li>
            ))}
            {categories.map((c) => {
              const key = categorySection(c.slug);
              return (
                <li key={c.id}>
                  <Link href={`/catalogo/${c.slug}`} aria-current={active === key ? "page" : undefined} className={linkClass}>
                    {c.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1 pr-2 lg:pr-8">
          <CartButton />
          <MobileMenu categories={categories} />
        </div>
      </div>
    </header>
  );
}
