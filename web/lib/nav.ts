import { useEffect, useState } from "react";
import { CircleHelpIcon, HouseIcon, ShoppingBasketIcon, StoreIcon, TagIcon } from "lucide-react";

/** Secciones de la home, en el orden en que aparecen en la página. Única fuente para el header y el menú mobile. */
export const sectionLinks = [
  { id: "inicio", href: "/", label: "Inicio", icon: HouseIcon },
  { id: "precios", href: "/#precios", label: "Precios", icon: TagIcon },
  { id: "catalogo", href: "/#catalogo", label: "Hacé tu pedido", icon: ShoppingBasketIcon },
  { id: "mayoristas", href: "/#mayoristas", label: "Mayoristas", icon: StoreIcon },
  { id: "preguntas", href: "/#preguntas", label: "Preguntas", icon: CircleHelpIcon },
];

/** Última sección cuyo borde superior ya cruzó la línea de lectura; "inicio" si ninguna (o no existe en la página). */
export function pickActiveSection(tops: { id: string; top: number | null }[], line: number): string {
  let current = "inicio";
  for (const { id, top } of tops) {
    if (top !== null && top <= line) current = id;
  }
  return current;
}

/** Id de la sección visible: en la home sigue el scroll; en catálogo/producto marca "catalogo"; en el resto, ninguna. */
export function useActiveSection(pathname: string): string | null {
  const [section, setSection] = useState("inicio");

  useEffect(() => {
    if (pathname !== "/") return;
    const ids = sectionLinks.slice(1).map((s) => s.id);
    let frame = 0;
    const update = () => {
      frame = 0;
      const tops = ids.map((id) => ({ id, top: document.getElementById(id)?.getBoundingClientRect().top ?? null }));
      setSection(pickActiveSection(tops, window.innerHeight * 0.4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname]);

  if (pathname === "/") return section;
  return pathname.startsWith("/catalogo") || pathname.startsWith("/producto") ? "catalogo" : null;
}

/** Pixels of scroll before the header capsules shrink a little. */
const COMPACT_AFTER = 8;

/** Whether the header should use its compact capsules for this scroll offset (overscroll counts as the top). */
export function isHeaderCompact(scrollY: number): boolean {
  return scrollY > COMPACT_AFTER;
}

/** Compact flag for the public header. Starts at the top so SSR and the first client render match. */
export function useHeaderCompact(): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setCompact(isHeaderCompact(window.scrollY));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return compact;
}
