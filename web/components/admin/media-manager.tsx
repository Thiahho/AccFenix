"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeftIcon, ArrowRightIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { addMedia, deleteMedia, getUploadSignature, updateMedia } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdminProduct } from "@/lib/admin/types";

const MAX_MB = 100;

type CloudinaryUpload = { secure_url: string; public_id: string; resource_type: string; error?: { message: string } };

/** Sube directo a Cloudinary con una firma emitida por la API (el secreto nunca llega al navegador). */
async function uploadToCloudinary(file: File): Promise<CloudinaryUpload> {
  const sig = await getUploadSignature();
  if (!sig.ok || !sig.data) throw new Error(sig.ok ? "Sin firma" : sig.error);
  const { cloudName, apiKey, timestamp, folder, signature } = sig.data;
  const body = new FormData();
  body.append("file", file);
  body.append("api_key", apiKey);
  body.append("timestamp", String(timestamp));
  body.append("folder", folder);
  body.append("signature", signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: "POST", body });
  const json = (await res.json()) as CloudinaryUpload;
  if (!res.ok) throw new Error(json.error?.message ?? "Error al subir a Cloudinary");
  return json;
}

export function MediaManager({ product }: { product: AdminProduct }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [pending, startTransition] = useTransition();
  const media = product.media;

  const valueOptions = product.categoryAttributes.flatMap((a) =>
    a.values.filter((v) => product.allowedValueIds.includes(v.id)).map((v) => ({ id: v.id, label: `${a.name}: ${v.label}` })),
  );

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files];
    setUploading(list.length);
    for (const file of list) {
      try {
        if (file.size > MAX_MB * 1024 * 1024) throw new Error(`${file.name} supera ${MAX_MB} MB`);
        const up = await uploadToCloudinary(file);
        const res = await addMedia(product.id, {
          url: up.secure_url,
          publicId: up.public_id,
          type: up.resource_type === "video" ? "video" : "image",
          attributeValueId: null,
        });
        if (!res.ok) throw new Error(res.error);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo subir el archivo");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (input.current) input.current.value = "";
    router.refresh();
  }

  function act(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error);
      router.refresh();
    });
  }

  function move(index: number, dir: -1 | 1) {
    const other = media[index + dir];
    const current = media[index];
    if (!other) return;
    act(async () => {
      const a = await updateMedia(current.id, { sortOrder: other.sortOrder });
      const b = await updateMedia(other.id, { sortOrder: current.sortOrder });
      return a.ok ? b : a;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-4">
        <p className="text-sm text-muted-foreground">
          Fotos y videos del producto. Podés asociar cada archivo a un valor (p. ej. un color) para que se muestre al elegirlo.
        </p>
        <input ref={input} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
        <Button onClick={() => input.current?.click()} disabled={uploading > 0}>
          <UploadIcon /> {uploading > 0 ? `Subiendo ${uploading}…` : "Subir archivos"}
        </Button>
      </div>

      {media.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-background p-10 text-center text-sm text-muted-foreground">Todavía no hay fotos ni videos.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {media.map((m, i) => (
            <li key={m.id} className="overflow-hidden rounded-xl border bg-background">
              <div className="relative aspect-square bg-brand-soft">
                {m.type === "video" ? (
                  <video src={m.url} controls className="size-full object-contain" />
                ) : (
                  <Image src={m.url} alt="" fill sizes="(min-width: 1024px) 33vw, 50vw" className="object-cover" />
                )}
                {i === 0 && <span className="absolute top-2 left-2 rounded bg-background/90 px-2 py-0.5 text-xs font-medium">Portada</span>}
              </div>
              <div className="space-y-2 p-3">
                <Select
                  value={m.attributeValueId ? String(m.attributeValueId) : "none"}
                  onValueChange={(v) => act(() => updateMedia(m.id, { attributeValueId: v === "none" ? null : Number(v) }))}
                >
                  <SelectTrigger className="w-full" aria-label="Asociar a un valor"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Todas las variantes</SelectItem>
                    {valueOptions.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex justify-between">
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" aria-label="Mover antes" disabled={pending || i === 0} onClick={() => move(i, -1)}><ArrowLeftIcon /></Button>
                    <Button size="icon" variant="ghost" aria-label="Mover después" disabled={pending || i === media.length - 1} onClick={() => move(i, 1)}><ArrowRightIcon /></Button>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Eliminar"
                    disabled={pending}
                    onClick={() => confirm("¿Eliminar este archivo?") && act(() => deleteMedia(m.id))}
                  >
                    <Trash2Icon className="text-destructive" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
