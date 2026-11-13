"use client";

import { usePathname } from "next/navigation";
import * as m from "motion/react-m";
import { MessageCircleIcon } from "lucide-react";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";
import { showsWhatsappFab } from "@/lib/nav";
import { whatsappUrl } from "@/lib/whatsapp";

/**
 * Botón flotante de WhatsApp para las páginas públicas: entra con un resorte y late unas pocas veces. Not on the
 * checkout, where it would compete with the order's own send button.
 */
export function WhatsappFab({ phone }: { phone: string }) {
  const reduce = usePrefersReducedMotion();
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
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 inline-flex h-12 items-center gap-2 rounded-full bg-[#128C4A] px-4 font-medium text-white shadow-lg shadow-black/25 transition-[translate,background-color] duration-200 hover:bg-[#0f7a40] focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
    >
      {/* Attention ring: three soft pulses a few seconds apart, then it stays quiet. */}
      {!reduce && (
        <m.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full bg-[#128C4A]"
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: [0.55, 0], scale: [1, 1.45] }}
          transition={{ duration: 1.6, ease: "easeOut", delay: 2.5, repeat: 2, repeatDelay: 4 }}
        />
      )}
      <MessageCircleIcon aria-hidden className="relative size-5" />
      <span className="relative hidden sm:inline">WhatsApp</span>
    </m.a>
  );
}
