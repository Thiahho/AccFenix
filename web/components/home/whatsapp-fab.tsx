"use client";

import { usePathname } from "next/navigation";
import * as m from "motion/react-m";
import { WhatsappCupIcon } from "@/components/site/whatsapp-cup-icon";
import { showsWhatsappFab } from "@/lib/nav";
import { whatsappUrl } from "@/lib/whatsapp";

/**
 * Botón flotante de WhatsApp para las páginas públicas: un bloque recto que entra con un resorte. Not on the
 * checkout, where it would compete with the order's own send button.
 */
export function WhatsappFab({ phone }: { phone: string }) {
  const pathname = usePathname();
  if (!phone || !showsWhatsappFab(pathname)) return null;
  return (
    <m.a
      href={whatsappUrl(phone, "¡Hola! Quiero hacer una consulta.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribinos por WhatsApp"
      data-whatsapp-fab
      initial={{ opacity: 0, scale: 0.6, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 18, delay: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 inline-flex h-12 min-w-12 items-center justify-center gap-2 border border-ivory bg-[#128C4A] px-3 font-bold text-white transition-[translate,background-color] duration-200 hover:bg-[#0f7a40]"
    >
      <WhatsappCupIcon className="relative size-5" />
      <span className="relative hidden sm:inline">WhatsApp</span>
    </m.a>
  );
}
