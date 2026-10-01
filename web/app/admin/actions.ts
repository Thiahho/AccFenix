"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import type { Availability } from "@/lib/api";
import { adminFetch, AdminApiError, clearSession, login } from "@/lib/admin/session";
import type { ActionResult } from "@/lib/admin/types";

/** Ejecuta una llamada admin, refresca el panel y el catálogo público, y traduce errores de la API. */
async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    revalidateTag("catalog");
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
  return run(() => (id ? adminFetch(`/api/admin/categories/${id}`, json("PUT", input)) : adminFetch("/api/admin/categories", json("POST", input))));
}

export async function deleteCategory(id: number) {
  return run(() => adminFetch(`/api/admin/categories/${id}`, json("DELETE")));
}

// ---- Atributos ----
export type AttributeInput = { name: string; slug?: string; sortOrder: number };
export type ValueInput = { label: string; sortOrder: number; colorHex?: string | null };

export async function saveAttribute(id: number | null, input: AttributeInput) {
  return run(() => (id ? adminFetch(`/api/admin/attributes/${id}`, json("PUT", input)) : adminFetch("/api/admin/attributes", json("POST", input))));
}

export async function deleteAttribute(id: number) {
  return run(() => adminFetch(`/api/admin/attributes/${id}`, json("DELETE")));
}

export async function saveValue(attributeId: number, id: number | null, input: ValueInput) {
  return run(() =>
    id
      ? adminFetch(`/api/admin/attribute-values/${id}`, json("PUT", input))
      : adminFetch(`/api/admin/attributes/${attributeId}/values`, json("POST", input)),
  );
}

export async function deleteValue(id: number) {
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
};

export async function createProduct(input: ProductInput) {
  return run(() => adminFetch<{ id: number }>("/api/admin/products", json("POST", input)));
}

export async function updateProduct(id: number, input: ProductInput) {
  return run(() => adminFetch(`/api/admin/products/${id}`, json("PUT", input)));
}

export async function deleteProduct(id: number) {
  const result = await run(() => adminFetch(`/api/admin/products/${id}`, json("DELETE")));
  if (result.ok) redirect("/admin/productos");
  return result;
}

export async function setVariant(id: number, patch: { availability?: Availability; isActive?: boolean }) {
  return run(() => adminFetch(`/api/admin/variants/${id}`, json("PATCH", patch)));
}

export async function bulkAvailability(productId: number, valueIds: number[], availability: Availability) {
  return run(() => adminFetch<{ updated: number }>("/api/admin/variants/bulk", json("PATCH", { productId, valueIds, availability })));
}

// ---- Media ----
export type UploadSignature = { cloudName: string; apiKey: string; timestamp: number; folder: string; signature: string };

export async function getUploadSignature() {
  return run(() => adminFetch<UploadSignature>("/api/admin/media/signature", json("POST")));
}

export async function addMedia(productId: number, input: { url: string; publicId: string; type: "image" | "video"; attributeValueId: number | null }) {
  return run(() => adminFetch(`/api/admin/products/${productId}/media`, json("POST", input)));
}

export async function updateMedia(id: number, patch: { sortOrder?: number; attributeValueId?: number | null }) {
  const body = patch.attributeValueId === null ? { ...patch, attributeValueId: undefined, clearAttributeValue: true } : patch;
  return run(() => adminFetch(`/api/admin/media/${id}`, json("PATCH", body)));
}

export async function deleteMedia(id: number) {
  return run(() => adminFetch(`/api/admin/media/${id}`, json("DELETE")));
}

// ---- Configuración ----
export async function saveSettings(input: { whatsappNumber: string; wholesaleThreshold: number }) {
  return run(() => adminFetch("/api/admin/settings", json("PUT", input)));
}
