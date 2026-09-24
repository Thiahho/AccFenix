"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveCategory } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { AdminAttribute, AdminCategory } from "@/lib/admin/types";

type Props = { category?: AdminCategory; attributes: AdminAttribute[] };

export function CategoryDialog({ trigger, ...props }: Props & { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {/* Se monta en cada apertura, así el formulario arranca con los datos actuales. */}
        <CategoryForm {...props} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CategoryForm({ category, attributes, onSaved }: Props & { onSaved: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [sortOrder, setSortOrder] = useState(category?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  // El orden de los atributos define el orden en que el comprador los elige.
  const [attributeIds, setAttributeIds] = useState<number[]>(category?.attributeIds ?? []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveCategory(category?.id ?? null, {
        name, slug: slug || undefined, description: description || undefined, sortOrder, isActive, attributeIds,
      });
      if (!res.ok) return void toast.error(res.error);
      toast.success(category ? "Categoría guardada" : "Categoría creada");
      onSaved();
      router.refresh();
    });
  }

  return (
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{category ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
            <DialogDescription>Los atributos elegidos son las opciones que tendrán sus productos.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Nombre</Label>
              <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-slug">Slug (URL)</Label>
              <Input id="cat-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="automático" maxLength={140} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cat-desc">Descripción</Label>
              <Textarea id="cat-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-order">Orden</Label>
              <Input id="cat-order" type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value) || 0)} />
            </div>
            <div className="flex items-center gap-3 self-end pb-2">
              <Switch id="cat-active" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="cat-active">Visible</Label>
            </div>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Atributos (en orden de elección)</legend>
            {attributes.length === 0 && <p className="text-sm text-muted-foreground">No hay atributos creados.</p>}
            <div className="flex flex-wrap gap-2">
              {attributes.map((a) => {
                const index = attributeIds.indexOf(a.id);
                return (
                  <Label key={a.id} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 font-normal has-data-[state=checked]:border-brand has-data-[state=checked]:bg-brand-soft">
                    <Checkbox
                      checked={index >= 0}
                      onCheckedChange={(c) => setAttributeIds((ids) => (c === true ? [...ids, a.id] : ids.filter((x) => x !== a.id)))}
                    />
                    {a.name}
                    {index >= 0 && <span className="text-xs text-muted-foreground tabular-nums">#{index + 1}</span>}
                  </Label>
                );
              })}
            </div>
            {category && category.productCount > 0 && (
              <p className="text-xs text-muted-foreground">Cambiar los atributos regenera las variantes de sus {category.productCount} productos.</p>
            )}
          </fieldset>
          <DialogFooter>
            <Button type="submit" disabled={pending || !name.trim()}>{pending ? "Guardando…" : "Guardar"}</Button>
          </DialogFooter>
        </form>
  );
}
