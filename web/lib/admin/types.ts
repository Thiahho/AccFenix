// Reflejan los DTOs de api/src/AccFenix.Api/Endpoints/AdminCatalogEndpoints.cs
import type { Availability } from "@/lib/api";

export type AdminCategory = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  attributeIds: number[];
  productCount: number;
};

export type AdminValue = { id: number; label: string; sortOrder: number; colorHex: string | null };

export type AdminAttribute = { id: number; name: string; slug: string; sortOrder: number; values: AdminValue[] };

export type AdminProductSummary = {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  activeVariants: number;
  onRequestVariants: number;
  coverUrl: string | null;
};

export type AdminVariant = { id: number; sku: string; valueIds: number[]; availability: Availability; isActive: boolean };

export type AdminMedia = { id: number; type: "image" | "video"; url: string; attributeValueId: number | null; sortOrder: number };

export type AdminProduct = {
  id: number;
  categoryId: number;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  allowedValueIds: number[];
  categoryAttributes: AdminAttribute[];
  variants: AdminVariant[];
  media: AdminMedia[];
};

export type AdminSettings = { whatsappNumber: string; wholesaleThreshold: number };

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };
