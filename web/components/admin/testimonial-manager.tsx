"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeftIcon, ArrowRightIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { addTestimonial, deleteTestimonial, getUploadSignature, updateTestimonial } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { uploadToCloudinary } from "@/lib/admin/cloudinary-upload";
import type { AdminTestimonial } from "@/lib/admin/types";
import { testimonialSourceLabel, type TestimonialSource } from "@/lib/api";

/** Same limit as the API (`Testimonial.CaptionMaxLength`). */
const captionMaxLength = 140;
const sources = Object.keys(testimonialSourceLabel) as TestimonialSource[];

type Result = { ok: boolean; error?: string };

function SourceSelect({ value, onChange, label, disabled }: { value: TestimonialSource; onChange: (v: TestimonialSource) => void; label: string; disabled?: boolean }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TestimonialSource)} disabled={disabled}>
      <SelectTrigger className="w-full sm:w-40" aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent>
        {sources.map((s) => <SelectItem key={s} value={s}>{testimonialSourceLabel[s]}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

/** Screenshots of customer messages (Instagram, WhatsApp...) for the home page. */
export function TestimonialManager({ testimonials }: { testimonials: AdminTestimonial[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [redacted, setRedacted] = useState(false);
  const [source, setSource] = useState<TestimonialSource>("instagram");
  const [uploading, setUploading] = useState(0);
  const [pending, startTransition] = useTransition();

  async function onFiles(files: FileList | null) {
    if (!files?.length || !redacted) return;
    const list = [...files];
    setUploading(list.length);
    for (const file of list) {
      try {
        if (!file.type.startsWith("image/")) throw new Error(`${file.name} no es una imagen`);
        const up = await uploadToCloudinary(file, getUploadSignature);
        if (up.resource_type !== "image" || !up.width || !up.height) throw new Error(`${file.name} no es una imagen`);
        const res = await addTestimonial({ url: up.secure_url, publicId: up.public_id, source, caption: null, width: up.width, height: up.height });
        if (!res.ok) throw new Error(res.error);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo subir la captura");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (input.current) input.current.value = "";
    // Each batch asks again: every screenshot has to be checked before it goes up.
    setRedacted(false);
    router.refresh();
  }

  function act(fn: () => Promise<Result>) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error);
      router.refresh();
    });
  }

  function move(index: number, dir: -1 | 1) {
    const current = testimonials[index];
    const other = testimonials[index + dir];
    if (!other) return;
    act(async () => {
      const a = await updateTestimonial(current.id, { sortOrder: other.sortOrder });
      const b = await updateTestimonial(other.id, { sortOrder: current.sortOrder });
      return a.ok ? b : a;
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border bg-background p-4">
        <p className="text-sm text-muted-foreground">
          Capturas de mensajes de clientes por Instagram o WhatsApp. Las publicadas se muestran en el inicio, en “Lo que dicen nuestros clientes”.
          Se suben ocultas: revisalas y publicalas cuando estén listas.
        </p>
        <Label className="flex cursor-pointer items-start gap-2 font-normal">
          <Checkbox checked={redacted} onCheckedChange={(c) => setRedacted(c === true)} className="mt-0.5" />
          <span>Taché nombres, fotos de perfil y números de teléfono. Las capturas son públicas y no se tapan solas.</span>
        </Label>
        <div className="flex flex-wrap items-center gap-3">
          <SourceSelect value={source} onChange={setSource} label="Fuente de las capturas a subir" disabled={uploading > 0} />
          <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          <Button onClick={() => input.current?.click()} disabled={!redacted || uploading > 0}>
            <UploadIcon /> {uploading > 0 ? `Subiendo ${uploading}…` : "Subir capturas"}
          </Button>
        </div>
      </div>

      {testimonials.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-background p-10 text-center text-sm text-muted-foreground">Todavía no hay capturas.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <li key={t.id} className="overflow-hidden rounded-xl border bg-background">
              <div className="relative aspect-[3/4] bg-brand-soft">
                <Image src={t.url} alt={t.caption ?? ""} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-contain" />
                <span className="absolute top-2 left-2 rounded bg-background/90 px-2 py-0.5 text-xs font-medium">
                  {t.isPublished ? "Publicada" : "Oculta"}
                </span>
              </div>
              <div className="space-y-3 p-3">
                <SourceSelect value={t.source} onChange={(v) => act(() => updateTestimonial(t.id, { source: v }))} label="Fuente" disabled={pending} />
                <CaptionInput testimonial={t} disabled={pending} onSave={(caption) => act(() => updateTestimonial(t.id, { caption }))} />
                <Label className="flex cursor-pointer items-center gap-2 font-normal">
                  <Switch
                    checked={t.isPublished}
                    disabled={pending}
                    onCheckedChange={(isPublished) => act(() => updateTestimonial(t.id, { isPublished }))}
                  />
                  Publicada en el inicio
                </Label>
                <div className="flex justify-between">
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" aria-label="Mover antes" disabled={pending || i === 0} onClick={() => move(i, -1)}><ArrowLeftIcon /></Button>
                    <Button size="icon" variant="ghost" aria-label="Mover después" disabled={pending || i === testimonials.length - 1} onClick={() => move(i, 1)}><ArrowRightIcon /></Button>
                  </div>
                  <ConfirmButton
                    size="icon"
                    label="Eliminar captura"
                    title="¿Eliminar esta captura?"
                    description="Se deja de mostrar en el inicio y se borra la imagen."
                    action={deleteTestimonial.bind(null, t.id)}
                  >
                    <Trash2Icon />
                  </ConfirmButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Saves when it loses focus, only if the text changed. */
function CaptionInput({ testimonial, disabled, onSave }: { testimonial: AdminTestimonial; disabled: boolean; onSave: (caption: string) => void }) {
  const saved = testimonial.caption ?? "";
  const [value, setValue] = useState(saved);
  return (
    <Input
      value={value}
      maxLength={captionMaxLength}
      disabled={disabled}
      placeholder="Texto corto (opcional)"
      aria-label="Texto de la captura"
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => value.trim() !== saved && onSave(value.trim())}
    />
  );
}
