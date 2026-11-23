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
  "poster-focus-inset flex h-full items-center px-2 text-xs font-bold tracking-wide whitespace-nowrap uppercase transition-colors hover:bg-oat lg:px-3 lg:text-[13px] aria-[current]:bg-espresso aria-[current]:text-ivory";

/** Flat full-width bar closed by a hard rule. The mobile menu panel hangs from it, so the header is its containing block. */
export function SiteHeader({ categories }: { categories: Category[] }) {
  const pathname = usePathname();
  const active = useActiveSection(pathname);

  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-espresso bg-ivory text-espresso">
      <div className="flex h-16 items-stretch">
        <Link
          href="/"
          aria-label={`${site.name} — inicio`}
          className="poster-focus-inset flex shrink-0 items-center border-r-[3px] border-espresso px-4 transition-colors hover:bg-oat lg:px-8"
        >
          <Wordmark className="text-3xl" />
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

        <div className="ml-auto flex items-stretch">
          <CartButton />
          <MobileMenu categories={categories} />
        </div>
      </div>
    </header>
  );
}
