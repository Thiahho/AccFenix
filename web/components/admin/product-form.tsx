"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createProduct, updateProduct, type ProductInput } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { AdminAttribute, AdminCategory, AdminProduct } from "@/lib/admin/types";
import { caffeineLabel, type CaffeineLevel } from "@/lib/api";
import { formatArs } from "@/lib/pricing";

type Props = {
  categories: AdminCategory[];
  attributes: AdminAttribute[];
  product?: AdminProduct;
};

/** Radix Select does not accept an empty value, so "not set" has its own. */
const NONE = "none";

function ScaleField({ id, label, value, onChange }: { id: string; label: string; value: number | null; onChange: (value: number | null) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value === null ? NONE : String(value)} onValueChange={(v) => onChange(v === NONE ? null : Number(v))}>
        <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Sin definir</SelectItem>
          {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n} de 5</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ProductForm({ categories, attributes, product }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [categoryId, setCategoryId] = useState<number | undefined>(product?.categoryId ?? categories[0]?.id);
  const [sortOrder, setSortOrder] = useState(product?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [allowed, setAllowed] = useState<Set<number>>(new Set(product?.allowedValueIds ?? []));
  const [intensity, setIntensity] = useState<number | null>(product?.intensity ?? null);
  const [caffeine, setCaffeine] = useState<CaffeineLevel | null>(product?.caffeine ?? null);
  const [sweetness, setSweetness] = useState<number | null>(product?.sweetness ?? null);
  const [flavorNotes, setFlavorNotes] = useState(product?.flavorNotes ?? "");

  const category = categories.find((c) => c.id === categoryId);
  const categoryAttributes = useMemo(
    () => (category?.attributeIds ?? []).map((id) => attributes.find((a) => a.id === id)).filter((a): a is AdminAttribute => !!a),
    [category, attributes],
  );
  const combinations = categoryAttributes
    .filter((a) => !a.isAddon)
    .map((a) => a.values.filter((v) => allowed.has(v.id)).length)
    .filter((n) => n > 0)
    .reduce((acc, n) => acc * n, 1);

  const toggle = (valueIds: number[], on: boolean) =>
    setAllowed((prev) => {
      const next = new Set(prev);
      valueIds.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId) return;
    const validIds = new Set(categoryAttributes.flatMap((a) => a.values.map((v) => v.id)));
    const input: ProductInput = {
      categoryId,
      name,
      slug: slug || undefined,
      description: description || undefined,
      sortOrder,
      isActive,
      allowedValueIds: [...allowed].filter((id) => validIds.has(id)),
      intensity,
      caffeine,
      sweetness,
      flavorNotes: flavorNotes.trim() || null,
    };
    startTransition(async () => {
      if (product) {
        const res = await updateProduct(product.id, input);
        if (!res.ok) return void toast.error(res.error);
        toast.success("Producto guardado y variantes actualizadas");
        router.refresh();
      } else {
        const res = await createProduct(input);
        if (!res.ok || !res.data) return void toast.error(res.ok ? "Error inesperado" : res.error);
        toast.success("Producto creado");
        router.push(`/admin/productos/${res.data.id}`);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="grid gap-4 rounded-xl border bg-background p-5 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={160} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category">Categoría</Label>
          <Select value={categoryId ? String(categoryId) : ""} onValueChange={(v) => setCategoryId(Number(v))}>
            <SelectTrigger id="category" className="w-full"><SelectValue placeholder="Elegí una categoría" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug (URL)</Label>
          <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Se genera a partir del nombre" maxLength={180} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sortOrder">Orden</Label>
          <Input id="sortOrder" type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value) || 0)} />
        </div>
        <div className="flex items-center gap-3 self-end pb-2">
          <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
          <Label htmlFor="isActive">Visible en el sitio</Label>
        </div>
      </section>

      <section className="rounded-xl border bg-background p-5">
        <h2 className="font-semibold">Características</h2>
        <p className="mt-1 text-sm text-muted-foreground">Se muestran en la tarjeta del producto. Lo que dejes sin definir no aparece.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <ScaleField id="intensity" label="Intensidad" value={intensity} onChange={setIntensity} />
          <div className="space-y-1.5">
            <Label htmlFor="caffeine">Cafeína</Label>
            <Select value={caffeine ?? NONE} onValueChange={(v) => setCaffeine(v === NONE ? null : (v as CaffeineLevel))}>
              <SelectTrigger id="caffeine" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin definir</SelectItem>
                {(Object.keys(caffeineLabel) as CaffeineLevel[]).map((level) => (
                  <SelectItem key={level} value={level}>{caffeineLabel[level]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ScaleField id="sweetness" label="Dulzor" value={sweetness} onChange={setSweetness} />
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="flavorNotes">Notas de sabor</Label>
            <Input id="flavorNotes" value={flavorNotes} onChange={(e) => setFlavorNotes(e.target.value)} placeholder="Caramelo, cacao" maxLength={160} />
            <p className="text-xs text-muted-foreground">Separalas con comas.</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-background p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Valores habilitados</h2>
          <p className="text-sm text-muted-foreground">
            Se generan <span className="font-medium text-foreground tabular-nums">{allowed.size ? combinations : 0}</span> combinaciones
          </p>
        </div>
        {categoryAttributes.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">La categoría no tiene atributos: el producto tendrá una única variante.</p>
        ) : (
          <div className="mt-4 space-y-5">
            {categoryAttributes.map((attr) => {
              const ids = attr.values.map((v) => v.id);
              const all = ids.every((id) => allowed.has(id));
              return (
                <fieldset key={attr.id}>
                  <div className="mb-2 flex items-center gap-3">
                    <legend className="text-sm font-medium">{attr.name}{attr.isAddon && " (extra opcional)"}</legend>
                    <button type="button" className="-mx-2 -my-3.5 px-2 py-3.5 text-xs text-brand hover:underline md:m-0 md:p-0" onClick={() => toggle(ids, !all)}>
                      {all ? "Ninguno" : "Todos"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {attr.values.map((v) => (
                      <Label
                        key={v.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 font-normal has-data-[state=checked]:border-brand has-data-[state=checked]:bg-brand-soft"
                      >
                        <Checkbox checked={allowed.has(v.id)} onCheckedChange={(c) => toggle([v.id], c === true)} />
                        {v.colorHex && <span aria-hidden className="size-3 rounded-full border" style={{ backgroundColor: v.colorHex }} />}
                        {v.label}
                        {attr.isAddon && <span className="text-muted-foreground">{v.addonPrice !== null ? `+ ${formatArs(v.addonPrice)}` : "sin precio"}</span>}
                      </Label>
                    ))}
                  </div>
                </fieldset>
              );
            })}
          </div>
        )}
        {product && (
          <p className="mt-4 text-xs text-muted-foreground">
            Al guardar, las combinaciones nuevas se crean como “Disponible” y las que ya no correspondan se desactivan (conservan su historial).
          </p>
        )}
      </section>

      <div className="flex justify-end gap-2">
        <Button type="submit" className="w-full sm:w-auto" disabled={pending || !categoryId || !name.trim()}>
          {pending ? "Guardando…" : product ? "Guardar cambios" : "Crear producto"}
        </Button>
      </div>
    </form>
  );
}
