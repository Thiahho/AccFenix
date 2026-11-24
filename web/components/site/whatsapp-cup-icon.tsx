import { cn } from "@/lib/utils";

/**
 * Compact iced-coffee cup with a "W" cut out of its body, for WhatsApp buttons. Drawn on a 24 px grid in
 * `currentColor` so it follows the button's text color, and kept to solid shapes so it stays legible at 20 px.
 * The letter is a path, not text, so it renders the same with any font. It is decorative: the button carries the label.
 */
export function WhatsappCupIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false" className={cn("shrink-0", className)}>
      {/* Straw */}
      <path d="M14.6 1.2 13.2 5.6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      {/* Domed lid and its rim */}
      <path d="M6 7.5a6 3 0 0 1 12 0Z" />
      <rect x="3.5" y="7.5" width="17" height="2" rx="1" />
      {/* Tapered body with the "W" cut out (even-odd fill) */}
      <path
        fillRule="evenodd"
        d="M5 10.3h14l-1.8 11.4a1.5 1.5 0 0 1-1.5 1.3H8.3a1.5 1.5 0 0 1-1.5-1.3ZM7.4 12.6h1.9l1.1 4 .9-3h1.4l.9 3 1.1-4h1.9l-2 7h-1.7l-.9-3-.9 3H9.4Z"
      />
    </svg>
  );
}
