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

export type HeaderScroll = { compact: boolean; hidden: boolean; lastY: number };

export const initialHeaderScroll: HeaderScroll = { compact: false, hidden: false, lastY: 0 };

/** Pixels of scroll before the header compacts. */
const COMPACT_AFTER = 8;
/** The header never hides above this offset (roughly its own height plus some air). */
const HIDE_AFTER = 96;
/** Direction changes smaller than this are ignored, so trackpad jitter does not flicker the header. */
const JITTER = 6;

/** Scroll-aware header: compacts once the page moved, hides while scrolling down and reappears on the way up. */
export function nextHeaderScroll(prev: HeaderScroll, rawY: number): HeaderScroll {
  const y = Math.max(0, rawY);
  const compact = y > COMPACT_AFTER;
  const delta = y - prev.lastY;
  if (y > HIDE_AFTER && Math.abs(delta) < JITTER && compact === prev.compact) return prev;
  const hidden = y > HIDE_AFTER && delta > 0;
  return { compact, hidden, lastY: y };
}

/** Compact/hidden flags for the public header. Starts at the top so SSR and the first client render match. */
export function useHeaderScroll(): Pick<HeaderScroll, "compact" | "hidden"> {
  const [state, setState] = useState({ compact: false, hidden: false });

  useEffect(() => {
    // Seed with the restored position so a reload mid-page does not read as "scrolling down".
    let current: HeaderScroll = { ...initialHeaderScroll, lastY: Math.max(0, window.scrollY) };
    let frame = 0;
    const update = () => {
      frame = 0;
      const next = nextHeaderScroll(current, window.scrollY);
      if (next === current) return;
      if (next.compact !== current.compact || next.hidden !== current.hidden) {
        setState({ compact: next.compact, hidden: next.hidden });
      }
      current = next;
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

  return state;
}
