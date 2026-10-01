import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VariantPicker } from "@/components/site/variant-picker";
import { api, NotFoundError } from "@/lib/api";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  try {
    return await api.product(slug);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await load(slug);
  const cover = product.media.find((m) => m.type === "image")?.url;
  return {
    title: product.name,
    description: product.description ?? `${product.name} — ${product.category.name}`,
    openGraph: cover ? { images: [cover] } : undefined,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await load(slug);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <VariantPicker product={product} />
    </div>
  );
}
