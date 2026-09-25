import { useEffect, useState } from "react";
import { BriefcaseIcon, CircleHelpIcon, HouseIcon, ImagesIcon, LayoutGridIcon } from "lucide-react";

/** Secciones de la home, en el orden en que aparecen en la página. */
export const sectionLinks = [
  { id: "inicio", href: "/", label: "Inicio", icon: HouseIcon },
  { id: "proyectos", href: "/#proyectos", label: "Proyectos", icon: ImagesIcon },
  { id: "catalogo", href: "/#catalogo", label: "Catálogo", icon: LayoutGridIcon },
  { id: "profesionales", href: "/#profesionales", label: "Profesionales", icon: BriefcaseIcon },
  { id: "preguntas", href: "/#preguntas", label: "Preguntas", icon: CircleHelpIcon },
];

/** Id de la sección visible: en la home sigue el scroll; en catálogo/producto marca "catalogo"; en el resto, ninguna. */
export function useActiveSection(pathname: string): string | null {
  const [section, setSection] = useState("inicio");

  useEffect(() => {
    if (pathname !== "/") return;
    const ids = sectionLinks.slice(1).map((s) => s.id);
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.4;
      let current = "inicio";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setSection(current);
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
