import { MessageCircleIcon } from "lucide-react";
import { whatsappUrl } from "@/lib/whatsapp";

/** Botón flotante de WhatsApp para todas las páginas públicas. */
export function WhatsappFab({ phone }: { phone: string }) {
  if (!phone) return null;
  return (
    <a
      href={whatsappUrl(phone, "¡Hola! Quiero hacer una consulta.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribinos por WhatsApp"
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 inline-flex h-12 items-center gap-2 rounded-full bg-[#128C4A] px-4 font-medium text-white shadow-lg shadow-black/25 transition-colors hover:bg-[#0f7a40] focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
    >
      <MessageCircleIcon aria-hidden className="size-5" />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}
