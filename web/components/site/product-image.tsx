import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Imagen de producto con placeholder mientras no haya fotos cargadas. */
export function ProductImage({ src, alt, className, priority, sizes }: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <div className={cn("relative aspect-square overflow-hidden rounded-lg bg-brand-soft", className)}>
      {src ? (
        <Image src={src} alt={alt} fill priority={priority} sizes={sizes ?? "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"} className="object-cover" />
      ) : (
        <div className="grid h-full place-items-center text-brand/40">
          <ImageIcon aria-hidden className="size-10" />
          <span className="sr-only">Sin foto</span>
        </div>
      )}
    </div>
  );
}
