"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon, StarIcon } from "lucide-react";
import { toast } from "sonner";
import { createReview, findReviewOrder } from "@/app/admin/actions";
import { Stars } from "@/components/site/product-facts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AdminReviewOrder } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

const COMMENT_MAX = 500;
const AUTHOR_MAX = 60;
const RATINGS = [1, 2, 3, 4, 5];

export function ReviewDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar reseña</DialogTitle>
          <DialogDescription>Para un cliente que te dejó su opinión por otro medio. Tiene que ser de un pedido pagado.</DialogDescription>
        </DialogHeader>
        {/* Mounted on every opening, so each review starts from an empty form. */}
        <ReviewForm onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ReviewForm({ onSaved }: { onSaved: () => void }) {
  const router = useRouter();
  const [searching, startSearch] = useTransition();
  const [saving, startSave] = useTransition();
  const [orderNumber, setOrderNumber] = useState("");
  const [order, setOrder] = useState<AdminReviewOrder | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [productId, setProductId] = useState<number | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function search(e: React.FormEvent) {
    e.preventDefault();
    const number = Number(orderNumber.trim().replace(/^#/, ""));
    startSearch(async () => {
      const res = await findReviewOrder(number);
      setProductId(null);
      setError(null);
      if (!res.ok || !res.data) {
        setOrder(null);
        setLookupError(res.ok ? "No se encontró el pedido" : res.error);
        return;
      }
      setLookupError(null);
      setOrder(res.data);
      setAuthorName(res.data.authorName);
      // With a single product left to review, pick it right away.
      const pending = res.data.products.filter((p) => p.rating === null);
      if (pending.length === 1) setProductId(pending[0].productId);
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    if (productId === null) return setError("Elegí el producto de la reseña.");
    if (rating === 0) return setError("Elegí de 1 a 5 estrellas.");
    setError(null);
    startSave(async () => {
      const res = await createReview({
        orderNumber: order.number,
        productId,
        rating,
        comment: comment.trim() || null,
        authorName: authorName.trim() || null,
      });
      if (!res.ok) return setError(res.error);
      toast.success("Reseña publicada");
      onSaved();
      router.refresh();
    });
  }

  const allReviewed = order !== null && order.products.every((p) => p.rating !== null);

  return (
    <div className="space-y-5">
      <form onSubmit={search} className="space-y-1.5">
        <Label htmlFor="review-order">Número de pedido</Label>
        <div className="flex gap-2">
          <Input
            id="review-order"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Ej. 128"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            aria-invalid={lookupError !== null}
            aria-describedby={lookupError ? "review-order-error" : undefined}
            maxLength={12}
          />
          <Button type="submit" variant="outline" disabled={searching || !orderNumber.trim()}>
            <SearchIcon /> {searching ? "Buscando…" : "Buscar"}
          </Button>
        </div>
        {lookupError && <p id="review-order-error" role="alert" className="text-sm text-destructive">{lookupError}</p>}
      </form>

      {order && (
        <form onSubmit={submit} className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Pedido <span className="font-medium text-foreground tabular-nums">#{order.number}</span> · {order.customerName}
          </p>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Producto</legend>
            {order.products.length === 0 && <p className="text-sm text-muted-foreground">Este pedido no tiene productos del catálogo para reseñar.</p>}
            {allReviewed && order.products.length > 0 && <p className="text-sm text-muted-foreground">Todos los productos de este pedido ya tienen reseña.</p>}
            {order.products.map((p) => {
              const reviewed = p.rating !== null;
              return (
                <label
                  key={p.productId}
                  className={cn(
                    "flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm has-checked:border-brand has-checked:bg-brand-soft has-focus-visible:outline-2 has-focus-visible:outline-ring",
                    reviewed ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                  )}
                >
                  <input
                    type="radio"
                    name="review-product"
                    value={p.productId}
                    checked={productId === p.productId}
                    onChange={() => setProductId(p.productId)}
                    disabled={reviewed}
                    className="size-4 accent-brand"
                  />
                  <span className="min-w-0 flex-1">{p.name}</span>
                  {reviewed && (
                    <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      Ya tiene reseña <Stars rating={p.rating!} />
                    </span>
                  )}
                </label>
              );
            })}
          </fieldset>

          {!allReviewed && (
            <>
              <fieldset>
                <legend className="mb-1 text-sm font-medium">Puntuación</legend>
                <div className="flex">
                  {RATINGS.map((n) => (
                    <label key={n} className="grid size-11 cursor-pointer place-items-center rounded-full has-focus-visible:outline-2 has-focus-visible:outline-ring">
                      <input type="radio" name="review-rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
                      <span className="sr-only">{n} {n === 1 ? "estrella" : "estrellas"}</span>
                      <StarIcon aria-hidden className={cn("size-7 text-caramel-deep", n <= rating ? "fill-current" : "opacity-40")} />
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <Label htmlFor="review-comment">Comentario (opcional)</Label>
                  <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">{comment.length}/{COMMENT_MAX}</span>
                </div>
                <Textarea id="review-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={COMMENT_MAX} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="review-author">Nombre que se publica</Label>
                <Input
                  id="review-author"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  maxLength={AUTHOR_MAX}
                  autoComplete="off"
                  aria-describedby="review-author-hint"
                />
                <p id="review-author-hint" className="text-xs text-muted-foreground">Solo el nombre (puede ser compuesto, como María José), sin apellido. Si lo dejás vacío se usa el del cliente.</p>
              </div>

              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

              <DialogFooter>
                <Button type="submit" disabled={saving}>{saving ? "Publicando…" : "Publicar reseña"}</Button>
              </DialogFooter>
            </>
          )}
        </form>
      )}
    </div>
  );
}
