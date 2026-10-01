import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Foto de la home; mientras el cliente no la entregue, muestra un espacio rotulado con lo que va ahí. */
export function PhotoSlot({ src, alt, hint, className, priority, sizes }: {
  src: string | null | undefined;
  alt: string;
  hint: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-brand-soft", className)}>
      {src ? (
        <Image src={src} alt={alt} fill priority={priority} sizes={sizes ?? "100vw"} className="object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center p-4 text-center text-brand/60">
          <div className="flex flex-col items-center gap-2">
            <ImageIcon aria-hidden className="size-8" />
            {hint && <span className="max-w-[24ch] text-xs text-pretty">{hint}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
