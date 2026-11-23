import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

const tones = { brand: "text-espresso", light: "text-cream" } as const;

/** Brand name set in the poster face. It is plain type, not the ColdCup logo, until the client delivers the final one. */
export function Wordmark({ className, tone = "brand" }: { className?: string; tone?: keyof typeof tones }) {
  return <span className={cn("poster-display", tones[tone], className)}>{site.name}</span>;
}
