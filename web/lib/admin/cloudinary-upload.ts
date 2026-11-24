import type { UploadSignature } from "@/app/admin/actions";
import type { ActionResult } from "@/lib/admin/types";

/** What Cloudinary answers to an upload; `width`/`height` come for images and videos. */
export type CloudinaryUpload = {
  secure_url: string;
  public_id: string;
  resource_type: string;
  width?: number;
  height?: number;
  error?: { message: string };
};

const megabytes = (bytes: number) => Math.round(bytes / (1024 * 1024));

/**
 * Sube directo a Cloudinary con una firma emitida por la API (el secreto nunca llega al navegador).
 * `sign` is the `getUploadSignature` server action; it is a parameter so this module does not import server code.
 */
export async function uploadToCloudinary(file: File, sign: () => Promise<ActionResult<UploadSignature>>): Promise<CloudinaryUpload> {
  const sig = await sign();
  if (!sig.ok || !sig.data) throw new Error(sig.ok ? "Sin firma" : sig.error);
  const { cloudName, apiKey, timestamp, folder, allowedFormats, signature, maxImageBytes, maxVideoBytes } = sig.data;
  // Cloudinary does not take a size limit as an upload parameter: the API hands out the limits and they are checked here.
  const maxBytes = file.type.startsWith("video/") ? maxVideoBytes : maxImageBytes;
  if (file.size > maxBytes) throw new Error(`${file.name} supera ${megabytes(maxBytes)} MB`);
  const body = new FormData();
  body.append("file", file);
  body.append("api_key", apiKey);
  body.append("timestamp", String(timestamp));
  body.append("folder", folder);
  body.append("allowed_formats", allowedFormats);
  body.append("signature", signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: "POST", body });
  const json = (await res.json()) as CloudinaryUpload;
  if (!res.ok) throw new Error(json.error?.message ?? "Error al subir a Cloudinary");
  return json;
}
