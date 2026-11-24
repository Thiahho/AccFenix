"use client";

import { useState, useTransition } from "react";
import { CheckCircle2Icon, StarIcon } from "lucide-react";
import { submitReview } from "@/app/actions/reviews";
import { Stars } from "@/components/site/product-facts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type ReviewableProduct = { productId: number; name: string; slug: string; rating: number | null; comment: string | null };

/** One product of the order: its saved review, or native radio stars plus an optional comment. */
export function ReviewForm({ token, product }: { token: string; product: ReviewableProduct }) {
  const [saved, setSaved] = useState(product.rating !== null ? { rating: product.rating, comment: product.comment ?? "" } : null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (saved) {
    return (
      <article className="rounded-2xl border border-border bg-card p-5">
        <h2 className="poster-display text-xl">{product.name}</h2>
        <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2Icon aria-hidden className="size-4 text-caramel-deep" /> Reseña enviada
        </p>
        <Stars rating={saved.rating} className="mt-2" />
        {saved.comment && <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">{saved.comment}</p>}
      </article>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return setError("Elegí de 1 a 5 estrellas.");
    setError(null);
    startTransition(async () => {
      const res = await submitReview({ token, productId: product.productId, rating, comment });
      if (res.ok) setSaved({ rating, comment: comment.trim() });
      else setError(res.error);
    });
  }

  const commentId = `comentario-${product.productId}`;
  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="poster-display text-xl">{product.name}</h2>
      <fieldset>
        <legend className="mb-1 text-sm font-semibold">Tu puntuación</legend>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="grid size-11 cursor-pointer place-items-center rounded-full has-focus-visible:outline-2 has-focus-visible:outline-ring">
              <input type="radio" name={`rating-${product.productId}`} value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
              <span className="sr-only">{n} {n === 1 ? "estrella" : "estrellas"}</span>
              <StarIcon aria-hidden className={cn("size-7 text-caramel-deep", n <= rating ? "fill-current" : "opacity-40")} />
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={commentId}>Comentario (opcional)</Label>
        <Textarea id={commentId} value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={500} />
        <p className="text-xs text-muted-foreground">Se publica con tu primer nombre. Después de enviarla no se puede editar.</p>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="w-full sm:w-fit" disabled={pending}>
        {pending ? "Enviando…" : "Publicar reseña"}
      </Button>
    </form>
  );
}
