import { StarIcon } from "lucide-react";
import { caffeineLabel, type ProductDetail, type ProductStats } from "@/lib/api";
import { cn } from "@/lib/utils";

const SCALE = [1, 2, 3, 4, 5];

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span role="img" aria-label={`${rating.toLocaleString("es-AR")} de 5 estrellas`} className={cn("inline-flex gap-0.5 text-caramel-deep", className)}>
      {SCALE.map((n) => (
        <StarIcon key={n} aria-hidden className={cn("size-4", n <= Math.round(rating) ? "fill-current" : "opacity-35")} />
      ))}
    </span>
  );
}

/** Real figures only: without reviews or paid orders the matching text is left out. */
export function RatingSummary({ stats }: { stats: ProductStats }) {
  const { averageRating, reviewCount, timesOrdered } = stats;
  return (
    <p className="flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
      {averageRating !== null ? (
        <>
          <Stars rating={averageRating} />
          <span className="font-bold text-foreground tabular-nums">{averageRating.toLocaleString("es-AR", { minimumFractionDigits: 1 })}</span>
          <span>
            {reviewCount} {reviewCount === 1 ? "reseña" : "reseñas"}
          </span>
        </>
      ) : (
        <span>Sin reseñas todavía</span>
      )}
      {timesOrdered > 0 && (
        <span>
          · {timesOrdered.toLocaleString("es-AR")} {timesOrdered === 1 ? "pedido" : "pedidos"}
        </span>
      )}
    </p>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-oat/60 p-2.5">
      <dt className="text-[11px] font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-1.5">
        <span className="sr-only">{value} de 5</span>
        <span aria-hidden className="flex gap-0.5">
          {SCALE.map((n) => (
            <span key={n} className={cn("h-1.5 flex-1 rounded-full", n <= value ? "bg-caramel-deep" : "bg-latte")} />
          ))}
        </span>
      </dd>
    </div>
  );
}

/** Tasting data of a product. Each empty field disappears, and with no data nothing renders. */
export function ProductFacts({ product }: { product: Pick<ProductDetail, "intensity" | "caffeine" | "sweetness" | "flavorNotes"> }) {
  const { intensity, caffeine, sweetness, flavorNotes } = product;
  const notes = flavorNotes?.split(",").map((n) => n.trim()).filter(Boolean) ?? [];
  const hasMeters = intensity !== null || caffeine !== null || sweetness !== null;
  if (!hasMeters && notes.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {hasMeters && (
        <dl className="grid grid-cols-3 gap-2">
          {intensity !== null && <Meter label="Intensidad" value={intensity} />}
          {caffeine !== null && (
            <div className="rounded-xl bg-oat/60 p-2.5">
              <dt className="text-[11px] font-semibold text-muted-foreground">Cafeína</dt>
              <dd className="mt-0.5 text-[13px] font-bold">{caffeineLabel[caffeine]}</dd>
            </div>
          )}
          {sweetness !== null && <Meter label="Dulzor" value={sweetness} />}
        </dl>
      )}
      {notes.length > 0 && (
        <ul aria-label="Notas de sabor" className="flex flex-wrap gap-1.5">
          {notes.map((note) => (
            <li key={note} className="rounded-full border border-border px-2.5 py-1 text-xs font-medium">
              {note}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
