"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import type { Availability, CaffeineLevel } from "@/lib/api";
import { adminFetch, AdminApiError, clearSession, login } from "@/lib/admin/session";
import type { ActionResult, AdminProduct, AdminSettings, VariantPrices } from "@/lib/admin/types";

/** Ejecuta una llamada admin, refresca el panel y el catálogo público, y traduce errores de la API. */
async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    updateTag("catalog");
    revalidatePath("/admin", "layout");
    return { ok: true, data };
  } catch (e) {
    unstable_rethrow(e); // deja pasar los redirect() de sesión expirada
    if (e instanceof AdminApiError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "No se pudo conectar con la API" };
  }
}

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

// Server actions are public endpoints: ids come from the client and end up in API paths, so check them at runtime.
const isId = (id: unknown): id is number => Number.isInteger(id) && (id as number) > 0;
const areIds = (ids: unknown): ids is number[] => Array.isArray(ids) && ids.every(isId);
const invalidId = { ok: false as const, error: "El elemento ya no existe" };

// ---- Sesión ----
export async function loginAction(_: unknown, formData: FormData): Promise<{ error?: string }> {
  const result = await login(String(formData.get("email") ?? ""), String(formData.get("password") ?? ""));
  if (!result.ok) return { error: result.error };
  redirect("/admin/productos");
}

export async function logoutAction() {
  await clearSession();
  redirect("/admin/login");
}

// ---- Categorías ----
export type CategoryInput = { name: string; slug?: string; description?: string; sortOrder: number; isActive: boolean; attributeIds: number[] };

export async function saveCategory(id: number | null, input: CategoryInput) {
  if (id !== null && !isId(id)) return invalidId;
  return run(() => (id ? adminFetch(`/api/admin/categories/${id}`, json("PUT", input)) : adminFetch("/api/admin/categories", json("POST", input))));
}

export async function deleteCategory(id: number) {
  if (!isId(id)) return invalidId;
  return run(() => adminFetch(`/api/admin/categories/${id}`, json("DELETE")));
}

// ---- Atributos ----
export type AttributeInput = { name: string; slug?: string; sortOrder: number; isAddon?: boolean };
export type ValueInput = { label: string; sortOrder: number; colorHex?: string | null; addonPrice?: number | null };

export async function saveAttribute(id: number | null, input: AttributeInput) {
  if (id !== null && !isId(id)) return invalidId;
  return run(() => (id ? adminFetch(`/api/admin/attributes/${id}`, json("PUT", input)) : adminFetch("/api/admin/attributes", json("POST", input))));
}

export async function deleteAttribute(id: number) {
  if (!isId(id)) return invalidId;
  return run(() => adminFetch(`/api/admin/attributes/${id}`, json("DELETE")));
}

export async function saveValue(attributeId: number, id: number | null, input: ValueInput) {
  if (!isId(attributeId) || (id !== null && !isId(id))) return invalidId;
  return run(() =>
    id
      ? adminFetch(`/api/admin/attribute-values/${id}`, json("PUT", input))
      : adminFetch(`/api/admin/attributes/${attributeId}/values`, json("POST", input)),
  );
}

export async function deleteValue(id: number) {
  if (!isId(id)) return invalidId;
  return run(() => adminFetch(`/api/admin/attribute-values/${id}`, json("DELETE")));
}

// ---- Productos ----
export type ProductInput = {
  categoryId: number;
  name: string;
  slug?: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  allowedValueIds: number[];
  intensity: number | null;
  caffeine: CaffeineLevel | null;
  sweetness: number | null;
  flavorNotes: string | null;
};

export async function createProduct(input: ProductInput) {
  return run(() => adminFetch<{ id: number }>("/api/admin/products", json("POST", input)));
}

export async function updateProduct(id: number, input: ProductInput) {
  if (!isId(id)) return invalidId;
  return run(() => adminFetch(`/api/admin/products/${id}`, json("PUT", input)));
}

export async function deleteProduct(id: number) {
  if (!isId(id)) return invalidId;
  const result = await run(() => adminFetch(`/api/admin/products/${id}`, json("DELETE")));
  if (result.ok) redirect("/admin/productos");
  return result;
}

/** All or nothing: an unknown id rejects the whole request. */
export async function deleteProducts(ids: number[]) {
  if (!areIds(ids)) return invalidId;
  return run(() => adminFetch<{ deleted: number }>("/api/admin/products/bulk-delete", json("POST", { ids })));
}

export type VariantSummary = { id: number; sku: string; label: string; availability: Availability; isActive: boolean; retailPrice: number | null };

/** Read only: loads the variants of one row of the products table when it is expanded. */
export async function getProductVariants(id: number): Promise<ActionResult<VariantSummary[]>> {
  if (!isId(id)) return invalidId;
  try {
    const product = await adminFetch<AdminProduct>(`/api/admin/products/${id}`);
    const attributes = product.categoryAttributes.filter((a) => !a.isAddon);
    const data = product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      label: attributes.flatMap((a) => a.values.filter((x) => v.valueIds.includes(x.id)).map((x) => x.label)).join(" · ") || v.sku,
      availability: v.availability,
      isActive: v.isActive,
      retailPrice: v.retailPrice,
    }));
    return { ok: true, data };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof AdminApiError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "No se pudo conectar con la API" };
  }
}

/** Omitted fields stay unchanged; an explicit null price clears it. */
export type VariantPatch = { availability?: Availability; isActive?: boolean; retailPrice?: number | null };

export async function setVariant(id: number, patch: VariantPatch) {
  if (!isId(id)) return invalidId;
  return run(() => adminFetch(`/api/admin/variants/${id}`, json("PATCH", patch)));
}

/** Replaces both prices of several variants of one product; the API applies all of them or none. */
export async function saveVariantPrices(productId: number, prices: VariantPrices[]) {
  if (!isId(productId)) return invalidId;
  return run(() => adminFetch<{ updated: number }>(`/api/admin/products/${productId}/variants/prices`, json("PUT", { prices })));
}

export async function bulkAvailability(productId: number, valueIds: number[], availability: Availability) {
  if (!isId(productId) || !areIds(valueIds)) return invalidId;
  return run(() => adminFetch<{ updated: number }>("/api/admin/variants/bulk", json("PATCH", { productId, valueIds, availability })));
}

// ---- Media ----
/** Mirrors the API `UploadSignature` record: every signed parameter must be sent to Cloudinary exactly as returned. */
export type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  allowedFormats: string;
  signature: string;
  maxImageBytes: number;
  maxVideoBytes: number;
};

export async function getUploadSignature() {
  return run(() => adminFetch<UploadSignature>("/api/admin/media/signature", json("POST")));
}

export async function addMedia(productId: number, input: { url: string; publicId: string; type: "image" | "video"; attributeValueId: number | null }) {
  if (!isId(productId)) return invalidId;
  return run(() => adminFetch(`/api/admin/products/${productId}/media`, json("POST", input)));
}

export async function updateMedia(id: number, patch: { sortOrder?: number; attributeValueId?: number | null }) {
  if (!isId(id)) return invalidId;
  const body = patch.attributeValueId === null ? { ...patch, attributeValueId: undefined, clearAttributeValue: true } : patch;
  return run(() => adminFetch(`/api/admin/media/${id}`, json("PATCH", body)));
}

export async function deleteMedia(id: number) {
  if (!isId(id)) return invalidId;
  return run(() => adminFetch(`/api/admin/media/${id}`, json("DELETE")));
}

// ---- Configuración ----
export async function saveSettings(input: AdminSettings) {
  return run(() => adminFetch("/api/admin/settings", json("PUT", input)));
}
