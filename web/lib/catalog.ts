import { api, type Availability, type ProductDetail, type Variant } from "@/lib/api";
import type { CartItem } from "@/stores/cart";

/**
 * Every active product with its variants, for the home price board.
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
    }));
}

/**
 * The cart line a price-board row adds: the same shape the product page adds, labelled like `describeSelection`
 * ("Presentación Cajón") so both entry points merge into one line. Null when the variant is not in the product.
 */
export function priceRowCartItem(
  product: Pick<ProductDetail, "name" | "slug" | "category" | "attributes" | "variants">,
  variantId: number,
): Omit<CartItem, "qty"> | null {
  const variant = product.variants.find((v) => v.id === variantId);
  if (!variant) return null;
  const valuesLabel = product.attributes
    .map((a) => {
      const value = a.values.find((v) => variant.valueIds.includes(v.id));
      return value ? `${a.name} ${value.label}` : null;
    })
    .filter(Boolean)
    .join(" · ");
  return {
    variantId: variant.id,
    productSlug: product.slug,
    productName: product.name,
    categoryName: product.category.name,
    valuesLabel,
    availability: variant.availability,
    retailPrice: variant.retailPrice,
  };
}

const normalizedText = (text: string | null) => text?.trim().toLocaleLowerCase("es") ?? "";

/** Clears descriptions that add nothing to a listing: the same text on several products, or the category's own text. */
export function uniqueDescriptions<P extends { description: string | null }>(products: P[], categoryDescription: string | null): P[] {
  const uses = new Map<string, number>();
  for (const { description } of products) {
    const key = normalizedText(description);
    uses.set(key, (uses.get(key) ?? 0) + 1);
  }
  const category = normalizedText(categoryDescription);
  return products.map((p) => {
    const key = normalizedText(p.description);
    return key && (key === category || (uses.get(key) ?? 0) > 1) ? { ...p, description: null } : p;
  });
}

/** Variants of each product by slug, for listings whose API response has no prices. A failed product is simply absent. */
export async function loadVariantsBySlug(slugs: string[]): Promise<Map<string, Variant[]>> {
  const results = await Promise.allSettled(slugs.map((slug) => api.product(slug)));
  return new Map(results.flatMap((r) => (r.status === "fulfilled" ? [[r.value.slug, r.value.variants] as const] : [])));
}
