"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { bulkAvailability, setVariant } from "@/app/admin/actions";
import { AvailabilityBadge } from "@/components/site/availability-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Availability } from "@/lib/api";
import type { AdminProduct, AdminVariant } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

export function VariantsGrid({ product }: { product: AdminProduct }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [variants, setVariants] = useState(product.variants);
  const [filter, setFilter] = useState<Record<number, number | undefined>>({});
  const [showInactive, setShowInactive] = useState(false);

  // Solo los atributos que efectivamente varían en este producto.
  const attributes = product.categoryAttributes
    .map((a) => ({ ...a, values: a.values.filter((v) => product.allowedValueIds.includes(v.id)) }))
    .filter((a) => a.values.length > 0);
  const labelOf = useMemo(() => new Map(product.categoryAttributes.flatMap((a) => a.values.map((v) => [v.id, v.label] as const))), [product]);
  const filterIds = Object.values(filter).filter((v): v is number => v !== undefined);

  const visible = variants.filter(
    (v) => (showInactive || v.isActive) && filterIds.every((id) => v.valueIds.includes(id)),
  );
  const onRequest = visible.filter((v) => v.isActive && v.availability === "aPedido").length;

  function toggleOne(variant: AdminVariant, availability: Availability) {
    setVariants((vs) => vs.map((v) => (v.id === variant.id ? { ...v, availability } : v)));
    startTransition(async () => {
      const res = await setVariant(variant.id, { availability });
      if (!res.ok) {
        toast.error(res.error);
        setVariants((vs) => vs.map((v) => (v.id === variant.id ? { ...v, availability: variant.availability } : v)));
      }
    });
  }

  function applyBulk(availability: Availability) {
    startTransition(async () => {
      const res = await bulkAvailability(product.id, filterIds, availability);
      if (!res.ok) return void toast.error(res.error);
      setVariants((vs) => vs.map((v) => (v.isActive && filterIds.every((id) => v.valueIds.includes(id)) ? { ...v, availability } : v)));
      toast.success(`${res.data?.updated ?? 0} variantes marcadas como ${availability === "disponible" ? "disponibles" : "a pedido"}`);
      router.refresh();
    });
  }

  if (variants.length === 0) {
    return <p className="rounded-xl border bg-background p-8 text-center text-sm text-muted-foreground">Este producto no tiene variantes. Habilitá valores en la pestaña Datos.</p>;
  }

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-xl border bg-background p-4" aria-label="Filtros">
        {attributes.map((attr) => (
          <div key={attr.id} className="flex flex-wrap items-center gap-2">
            <span className="w-20 shrink-0 text-sm font-medium">{attr.name}</span>
            {[{ id: undefined, label: "Todos" }, ...attr.values].map((v) => {
              const active = filter[attr.id] === v.id;
              return (
                <button
                  key={v.id ?? "all"}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter((f) => ({ ...f, [attr.id]: v.id }))}
                  className={cn("rounded-full border px-3 py-1 text-sm tabular-nums", active ? "border-brand bg-brand text-brand-foreground" : "hover:bg-muted")}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="text-sm text-muted-foreground">
            {visible.length} variantes{onRequest > 0 && ` · ${onRequest} a pedido`}
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={pending} onClick={() => applyBulk("disponible")}>
              Marcar {filterIds.length ? "filtradas" : "todas"} disponibles
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => applyBulk("aPedido")}>
              Marcar {filterIds.length ? "filtradas" : "todas"} a pedido
            </Button>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-2">
        <Switch id="inactive" checked={showInactive} onCheckedChange={setShowInactive} />
        <Label htmlFor="inactive" className="font-normal text-muted-foreground">Mostrar combinaciones desactivadas</Label>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              {attributes.map((a) => <TableHead key={a.id}>{a.name}</TableHead>)}
              <TableHead className="hidden md:table-cell">SKU</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Disponible</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((v) => (
              <TableRow key={v.id} className={cn(!v.isActive && "opacity-50")}>
                {attributes.map((a) => (
                  <TableCell key={a.id} className="tabular-nums">
                    {labelOf.get(v.valueIds.find((id) => a.values.some((x) => x.id === id)) ?? -1) ?? "—"}
                  </TableCell>
                ))}
                <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">{v.sku}</TableCell>
                <TableCell>{v.isActive ? <AvailabilityBadge availability={v.availability} /> : <span className="text-xs">Desactivada</span>}</TableCell>
                <TableCell className="text-right">
                  <Switch
                    aria-label={`Disponible: ${v.sku}`}
                    checked={v.availability === "disponible"}
                    disabled={!v.isActive}
                    onCheckedChange={(on) => toggleOne(v, on ? "disponible" : "aPedido")}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
