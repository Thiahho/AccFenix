"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { clientIpHeaders } from "@/lib/admin/client-ip";
import { baseUrl } from "@/lib/api";

const reviewSchema = z.object({
  token: z.string().regex(/^[0-9a-f]{32}$/),
  productId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500),
});

export type SubmitReviewResult = { ok: true } | { ok: false; error: string };

const messages: Record<number, string> = {
  400: "Revisá la puntuación y el comentario.",
  404: "Este enlace de reseña no es válido.",
  409: "Ya dejaste una reseña de este producto.",
  429: "Hiciste muchos intentos. Probá de nuevo en unos minutos.",
};

/** Runs on the server so the API rate limits per visitor. The token stays in the query string, out of the request logs. */
export async function submitReview(input: z.input<typeof reviewSchema>): Promise<SubmitReviewResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: messages[400] };
  const { token, productId, rating, comment } = parsed.data;

  try {
    const res = await fetch(`${baseUrl()}/api/reviews?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...clientIpHeaders(await headers(), process.env.API_TRUSTED_KEY) },
      body: JSON.stringify({ productId, rating, comment: comment.trim() || null }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok ? { ok: true } : { ok: false, error: messages[res.status] ?? "No pudimos guardar tu reseña. Probá de nuevo." };
  } catch {
    return { ok: false, error: "No pudimos guardar tu reseña. Probá de nuevo." };
  }
}
