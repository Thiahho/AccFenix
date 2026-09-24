"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { deleteAttribute, deleteValue, saveAttribute, saveValue } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminAttribute, AdminValue } from "@/lib/admin/types";

function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success?: string, after?: () => void) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.error);
      if (success) toast.success(success);
      after?.();
      router.refresh();
    });
  return { pending, run };
}

function ValueRow({ attributeId, value }: { attributeId: number; value: AdminValue }) {
  const { pending, run } = useAction();
  const [label, setLabel] = useState(value.label);
  const [colorHex, setColorHex] = useState(value.colorHex ?? "");
  const [sortOrder, setSortOrder] = useState(value.sortOrder);
  const dirty = label !== value.label || colorHex !== (value.colorHex ?? "") || sortOrder !== value.sortOrder;

  return (
    <li className="flex items-center gap-2">
      <Input aria-label="Orden" type="number" className="w-16" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value) || 0)} />
      <Input aria-label="Valor" className="flex-1" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} />
      <label className="relative grid size-9 shrink-0 cursor-pointer place-items-center rounded-md border" title="Color de muestra (opcional)">
        <span className="size-5 rounded-full border" style={{ backgroundColor: colorHex || "transparent" }} />
        <input type="color" aria-label="Color de muestra" className="absolute inset-0 cursor-pointer opacity-0" value={colorHex || "#ffffff"} onChange={(e) => setColorHex(e.target.value)} />
      </label>
      <Button
        size="icon"
        variant={dirty ? "default" : "ghost"}
        aria-label="Guardar valor"
        disabled={!dirty || pending || !label.trim()}
        onClick={() => run(() => saveValue(attributeId, value.id, { label, sortOrder, colorHex: colorHex || null }), "Valor guardado")}
      >
        <CheckIcon />
      </Button>
      <ConfirmButton size="icon" label={`Eliminar ${value.label}`} title={`¿Eliminar “${value.label}”?`} description="No se puede eliminar si algún producto lo usa." action={() => deleteValue(value.id)}>
        <Trash2Icon />
      </ConfirmButton>
    </li>
  );
}

function AttributeCard({ attribute }: { attribute: AdminAttribute }) {
  const { pending, run } = useAction();
  const [name, setName] = useState(attribute.name);
  const [newLabel, setNewLabel] = useState("");
  const nextOrder = (attribute.values.at(-1)?.sortOrder ?? -1) + 1;

  return (
    <section className="rounded-xl border bg-background p-5">
      <div className="flex items-center gap-2">
        <Input aria-label="Nombre del atributo" className="max-w-xs font-medium" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        {name !== attribute.name && (
          <Button size="sm" disabled={pending || !name.trim()} onClick={() => run(() => saveAttribute(attribute.id, { name, sortOrder: attribute.sortOrder }), "Atributo guardado")}>
            Guardar
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{attribute.values.length} valores</span>
        <ConfirmButton size="icon" label={`Eliminar ${attribute.name}`} title={`¿Eliminar “${attribute.name}”?`} description="Solo si no está asignado a ninguna categoría ni usado por productos." action={() => deleteAttribute(attribute.id)}>
          <Trash2Icon />
        </ConfirmButton>
      </div>
      <ul className="mt-4 space-y-2">
        {attribute.values.map((v) => <ValueRow key={`${v.id}-${v.label}-${v.colorHex}-${v.sortOrder}`} attributeId={attribute.id} value={v} />)}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveValue(attribute.id, null, { label: newLabel, sortOrder: nextOrder }), undefined, () => setNewLabel(""));
        }}
      >
        <Input aria-label={`Nuevo valor de ${attribute.name}`} placeholder="Nuevo valor…" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} maxLength={80} />
        <Button type="submit" variant="outline" disabled={pending || !newLabel.trim()}><PlusIcon /> Agregar</Button>
      </form>
    </section>
  );
}

export function AttributesEditor({ attributes }: { attributes: AdminAttribute[] }) {
  const { pending, run } = useAction();
  const [newName, setNewName] = useState("");
  const nextOrder = (attributes.at(-1)?.sortOrder ?? -1) + 1;

  return (
    <div className="space-y-4">
      {attributes.map((a) => <AttributeCard key={a.id} attribute={a} />)}
      <form
        className="flex gap-2 rounded-xl border border-dashed bg-background p-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveAttribute(null, { name: newName, sortOrder: nextOrder }), "Atributo creado", () => setNewName(""));
        }}
      >
        <Input aria-label="Nombre del nuevo atributo" placeholder="Nuevo atributo (p. ej. Material)" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={80} />
        <Button type="submit" disabled={pending || !newName.trim()}><PlusIcon /> Crear atributo</Button>
      </form>
    </div>
  );
}
