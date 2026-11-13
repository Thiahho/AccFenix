import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

const tones = { brand: "text-brand", light: "text-cream" } as const;

/** Script "Eggy" wordmark; it replaces the image logo until the client delivers the final one. */
export function Wordmark({ className, tone = "brand" }: { className?: string; tone?: keyof typeof tones }) {
  return <span className={cn("wordmark", tones[tone], className)}>{site.name}</span>;
}
