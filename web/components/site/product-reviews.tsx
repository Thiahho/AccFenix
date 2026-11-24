import { Stars } from "@/components/site/product-facts";
import type { ProductDetail } from "@/lib/api";

const dateFormat = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });

/** Latest verified reviews of a product, written by customers through the private link of a paid order. */
export function ProductReviews({ product }: { product: Pick<ProductDetail, "stats" | "reviews"> }) {
  const { stats, reviews } = product;
  return (
    <section aria-labelledby="resenas-titulo" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <p className="poster-hand text-2xl text-caramel-deep">Compras verificadas</p>
      <h2 id="resenas-titulo" className="poster-display poster-section-title mt-1">
        Reseñas{stats.reviewCount > 0 ? ` (${stats.reviewCount})` : ""}
      </h2>
      {reviews.length === 0 ? (
        <p className="mt-4 text-muted-foreground">Todavía no hay reseñas de este producto.</p>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reviews.map((review) => (
            <li key={review.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5">
              <Stars rating={review.rating} />
              {review.comment && <p className="text-sm leading-relaxed text-pretty whitespace-pre-line">{review.comment}</p>}
              <p className="mt-auto pt-1 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{review.authorName}</span> · {dateFormat.format(new Date(review.createdAt))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
