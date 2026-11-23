import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Accessible description; without it the drawing is decorative. */
  label?: string;
};

/** Original iced-coffee illustration drawn with the theme tokens. It is not the ColdCup logo. */
export function IcedCup({ className, label }: Props) {
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };

  return (
    <svg viewBox="0 0 200 290" className={cn("block h-auto w-full", className)} {...a11y}>
      <defs>
        <clipPath id="iced-cup-body">
          <path d="M38 78h124l-15 186a16 16 0 0 1-16 15H69a16 16 0 0 1-16-15Z" />
        </clipPath>
      </defs>

      <path d="M122 6l-10 66" stroke="var(--caramel-deep)" strokeWidth={10} strokeLinecap="round" />

      <g clipPath="url(#iced-cup-body)">
        <rect x="30" y="78" width="140" height="205" fill="var(--ivory)" />
        <path d="M30 112c24-12 44 10 70 2s46-14 70-2v80H30Z" fill="var(--caramel)" />
        <path d="M30 150c26 12 46-10 72-2s44 12 68 0v140H30Z" fill="var(--espresso)" />
        <path d="M30 214c22 14 48-8 72 2s46 10 68-2v70H30Z" fill="var(--caramel-deep)" />
        <g fill="var(--cream)" fillOpacity={0.62} stroke="var(--ivory)" strokeWidth={2}>
          <rect x="58" y="98" width="34" height="34" rx="7" transform="rotate(-12 75 115)" />
          <rect x="106" y="108" width="36" height="36" rx="7" transform="rotate(14 124 126)" />
          <rect x="74" y="146" width="32" height="32" rx="7" transform="rotate(10 90 162)" />
        </g>
        <path d="M58 86l13 182" stroke="var(--ivory)" strokeOpacity={0.45} strokeWidth={7} strokeLinecap="round" />
      </g>

      <path d="M38 78h124l-15 186a16 16 0 0 1-16 15H69a16 16 0 0 1-16-15Z" fill="none" stroke="var(--espresso)" strokeWidth={4} />
      <path d="M46 70c4-24 28-34 54-34s50 10 54 34Z" fill="var(--ivory)" fillOpacity={0.8} stroke="var(--espresso)" strokeWidth={4} strokeLinejoin="round" />
      <rect x="28" y="66" width="144" height="15" rx="7.5" fill="var(--latte)" stroke="var(--espresso)" strokeWidth={4} />
    </svg>
  );
}
