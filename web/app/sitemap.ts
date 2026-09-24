import type { MetadataRoute } from "next";
import { api } from "@/lib/api";
import { site } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [{ url: site.url, changeFrequency: "weekly", priority: 1 }];
  try {
    const categories = await api.categories();
    const listings = await Promise.all(categories.map((c) => api.categoryProducts(c.slug)));
    for (const { category, products } of listings) {
      entries.push({ url: `${site.url}/catalogo/${category.slug}`, changeFrequency: "weekly", priority: 0.8 });
      for (const p of products) entries.push({ url: `${site.url}/producto/${p.slug}`, changeFrequency: "weekly", priority: 0.6 });
    }
  } catch {
    // Sin API se publica solo la home.
  }
  return entries;
}
