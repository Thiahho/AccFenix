// Cliente de la API pública. Los tipos reflejan los DTOs de api/src/AccFenix.Api/Endpoints/PublicEndpoints.cs.

export type Availability = "disponible" | "aPedido";

export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  productCount: number;
};

export type ProductSummary = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
};

export type AttributeValue = { id: number; label: string; colorHex: string | null };

export type ProductAttribute = { id: number; name: string; slug: string; values: AttributeValue[] };

export type Variant = { id: number; sku: string; valueIds: number[]; availability: Availability };

export type Media = { id: number; type: "image" | "video"; url: string; attributeValueId: number | null };

export type ProductDetail = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  category: { name: string; slug: string };
  attributes: ProductAttribute[];
  variants: Variant[];
  media: Media[];
};

export type VariantStatus = { id: number; isActive: boolean; availability: Availability };

export type PublicSettings = { whatsappNumber: string; wholesaleThreshold: number };

export const availabilityLabel: Record<Availability, string> = {
  disponible: "Disponible",
  aPedido: "A pedido",
};

function baseUrl() {
  // En el servidor preferimos la URL interna; en el navegador, la pública.
  return (typeof window === "undefined" ? process.env.API_URL : undefined) ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5080";
}

export class NotFoundError extends Error {}

async function get<T>(path: string, init?: RequestInit & { next?: { revalidate?: number; tags?: string[] } }): Promise<T> {
  const defaults = init?.cache ? {} : { next: { revalidate: 60, tags: ["catalog"] } };
  const res = await fetch(`${baseUrl()}${path}`, { ...defaults, ...init });
  if (res.status === 404) throw new NotFoundError(path);
  if (!res.ok) throw new Error(`API ${res.status} en ${path}`);
  return res.json() as Promise<T>;
}

export const api = {
  categories: () => get<Category[]>("/api/categories"),
  categoryProducts: (slug: string) =>
    get<{ category: Category; products: ProductSummary[] }>(`/api/categories/${encodeURIComponent(slug)}/products`),
  product: (slug: string) => get<ProductDetail>(`/api/products/${encodeURIComponent(slug)}`),
  settings: () => get<PublicSettings>("/api/settings/public"),
  variantStatus: (ids: number[]) => get<VariantStatus[]>(`/api/variants?ids=${ids.join(",")}`, { cache: "no-store" }),
};
