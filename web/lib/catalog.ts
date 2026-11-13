import { api, type Availability, type ProductDetail } from "@/lib/api";

/**
 * Every active product with its variants, for the home price board and order grid.
 * The home must render without the API, so any failure yields fewer products instead of an error.
 */
export async function loadCatalogProducts(): Promise<ProductDetail[]> {
  try {
    const categories = await api.categories();
    const listings = await Promise.all(categories.map((c) => api.categoryProducts(c.slug)));
    const slugs = [...new Set(listings.flatMap((l) => l.products.map((p) => p.slug)))];
    const results = await Promise.allSettled(slugs.map((slug) => api.product(slug)));
    return results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  } catch {
    return [];
  }
}

/** "Huevos N°1" → { main: "Huevos", grade: "N°1" }, for the "HUEVOS | N°1" board heading. */
export function splitProductName(name: string): { main: string; grade: string | null } {
  const match = /^(.+?)\s+(N[°º.]?\s*\d+\S*)$/i.exec(name.trim());
  return match ? { main: match[1], grade: match[2] } : { main: name.trim(), grade: null };
}

export type PriceRow = {
  variantId: number;
  label: string;
  availability: Availability;
  retailPrice: number | null;
  wholesalePrice: number | null;
};

/** One row per variant, labelled with its value labels and ordered like the attributes and their values. */
export function priceRows(product: Pick<ProductDetail, "attributes" | "variants">): PriceRow[] {
  const picks = (valueIds: number[]) =>
    product.attributes.map((a) => {
      const index = a.values.findIndex((v) => valueIds.includes(v.id));
      return { index: index < 0 ? Number.MAX_SAFE_INTEGER : index, label: a.values[index]?.label };
    });

  return product.variants
    .map((v) => ({ v, picks: picks(v.valueIds) }))
    .sort((a, b) => {
      for (let i = 0; i < a.picks.length; i++) {
        const diff = a.picks[i].index - b.picks[i].index;
        if (diff !== 0) return diff;
      }
      return a.v.id - b.v.id;
    })
    .map(({ v, picks }) => ({
      variantId: v.id,
      label: picks.map((p) => p.label).filter(Boolean).join(" · ") || v.sku,
      availability: v.availability,
      retailPrice: v.retailPrice,
      wholesalePrice: v.wholesalePrice,
    }));
}
