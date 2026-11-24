import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { PosterHead } from "@/components/site/poster-head";
import { ReviewForm, type ReviewableProduct } from "@/components/site/review-form";
import { Button } from "@/components/ui/button";
import { clientIpHeaders } from "@/lib/admin/client-ip";
import { baseUrl } from "@/lib/api";

// The URL carries the order's secret token: never indexed, never sent as a referrer.
export const metadata: Metadata = { title: "Dejá tu reseña", robots: { index: false }, referrer: "no-referrer" };

type ReviewOrder = { number: number; products: ReviewableProduct[] };

async function loadOrder(token: string | undefined): Promise<ReviewOrder | null> {
  if (!token || !/^[0-9a-f]{32}$/.test(token)) return null;
  try {
    const res = await fetch(`${baseUrl()}/api/reviews/order?token=${token}`, {
      cache: "no-store",
      headers: clientIpHeaders(await headers(), process.env.API_TRUSTED_KEY),
    });
    return res.ok ? ((await res.json()) as ReviewOrder) : null;
  } catch {
    return null;
  }
}

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : undefined;
  const order = await loadOrder(value);

  return (
    <div>
      <PosterHead label={order ? `Pedido #${order.number}` : "Reseñas"} title="¿Qué te pareció?" />
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8 sm:px-6 lg:py-12">
        {order && value && order.products.length > 0 ? (
          order.products.map((product) => <ReviewForm key={product.productId} token={value} product={product} />)
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-muted-foreground">
              {order ? "Los productos de este pedido ya no están en la carta." : "Este enlace no es válido o el pago del pedido todavía no se acreditó."}
            </p>
            <Button asChild className="mt-5"><Link href="/">Volver a la carta</Link></Button>
          </div>
        )}
      </div>
    </div>
  );
}
