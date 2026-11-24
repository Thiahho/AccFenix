"use client";

import { Fragment, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronRightIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { deleteProducts, getProductVariants, type VariantSummary } from "@/app/admin/actions";
import { UrlSortHead } from "@/components/admin/data-table";
import { AvailabilityBadge } from "@/components/site/availability-badge";
import { ProductImage } from "@/components/site/product-image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminProductSummary } from "@/lib/admin/types";
import { formatArs } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const plural = (n: number) => (n === 1 ? "1 producto" : `${n} productos`);

type VariantsState = { status: "loading" } | { status: "error"; error: string } | { status: "ready"; variants: VariantSummary[] };

/**
 * Product grid with row selection, bulk delete and expandable variants, loaded when a row is opened.
 * Selection only covers the current page; the page remounts this component (via `key`) when the list changes.
 */
export function ProductsTable({ products }: { products: AdminProductSummary[] }) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [details, setDetails] = useState<Record<number, VariantsState>>({});

  // Ignore ids that are no longer listed (e.g. deleted elsewhere and refreshed).
  const selectedIds = products.filter((p) => selected.has(p.id)).map((p) => p.id);
  const count = selectedIds.length;
  const allChecked = count > 0 && count === products.length ? true : count > 0 ? "indeterminate" : false;

  function toggle(id: number, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(products.map((p) => p.id)) : new Set());
  }

  async function loadVariants(id: number) {
    setDetails((d) => ({ ...d, [id]: { status: "loading" } }));
    let next: VariantsState;
    try {
      const res = await getProductVariants(id);
      next = res.ok ? { status: "ready", variants: res.data ?? [] } : { status: "error", error: res.error };
    } catch {
      next = { status: "error", error: "No se pudieron cargar las variantes" };
    }
    setDetails((d) => ({ ...d, [id]: next }));
  }

  function toggleExpanded(id: number) {
    const opening = !expanded.has(id);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (opening) next.add(id);
      else next.delete(id);
      return next;
    });
    if (opening && details[id]?.status !== "ready" && details[id]?.status !== "loading") void loadVariants(id);
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteProducts(selectedIds);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSelected(new Set());
      const deleted = res.data?.deleted ?? count;
      toast.success(`${plural(deleted)} eliminado${deleted === 1 ? "" : "s"}`);
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      {count > 0 && (
        <div className="flex items-center justify-between gap-3 border-b bg-muted/50 px-4 py-2">
          <p className="text-sm font-medium" aria-live="polite">
            {count} seleccionado{count === 1 ? "" : "s"}
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="h-11 md:h-7" disabled={pending}>
                <Trash2Icon /> Eliminar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar {plural(count)}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se borran los productos, sus variantes y sus fotos. Esta acción no se puede deshacer. Si solo querés ocultarlos, desactivá
                  “Visible en el sitio” en cada uno.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={remove}>
                  Eliminar {plural(count)}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allChecked}
                onCheckedChange={(v) => toggleAll(v === true)}
                disabled={pending}
                aria-label="Seleccionar todos los productos de esta página"
              />
            </TableHead>
            <TableHead className="w-10"><span className="sr-only">Ver variantes</span></TableHead>
            <TableHead className="w-16"><span className="sr-only">Foto</span></TableHead>
            <UrlSortHead column="name" label="Producto" />
            <UrlSortHead column="category" label="Categoría" className="hidden sm:table-cell" />
            <UrlSortHead column="variants" label="Variantes" align="right" />
            <UrlSortHead column="onRequest" label="A pedido" align="right" className="hidden sm:table-cell" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => {
            const isOpen = expanded.has(p.id);
            return (
              <Fragment key={p.id}>
                <TableRow className="relative" data-state={selected.has(p.id) ? "selected" : undefined}>
                  {/* Above the row's stretched link, so clicking the checkbox does not navigate. */}
                  <TableCell className="relative z-10">
                    <Checkbox
                      checked={selected.has(p.id)}
                      onCheckedChange={(v) => toggle(p.id, v === true)}
                      disabled={pending}
                      aria-label={`Seleccionar ${p.name}`}
                    />
                  </TableCell>
                  <TableCell className="relative z-10 px-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-expanded={isOpen}
                      aria-controls={`variants-${p.id}`}
                      aria-label={`${isOpen ? "Ocultar" : "Ver"} variantes de ${p.name}`}
                      onClick={() => toggleExpanded(p.id)}
                    >
                      <ChevronRightIcon className={cn("transition-transform", isOpen && "rotate-90")} />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <ProductImage src={p.coverUrl} alt="" className="size-10 rounded-md" sizes="40px" />
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <Link href={`/admin/productos/${p.id}`} className="font-medium after:absolute after:inset-0 hover:text-brand">
                      {p.name}
                    </Link>
                    {!p.isActive && <Badge variant="secondary" className="ml-2">Oculto</Badge>}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{p.categoryName}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.activeVariants}</TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {p.onRequestVariants > 0 ? <span className="text-amber-700">{p.onRequestVariants}</span> : "—"}
                  </TableCell>
                </TableRow>
                {isOpen && (
                  <TableRow id={`variants-${p.id}`} className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={7} className="p-3 whitespace-normal">
                      <VariantsPanel productId={p.id} state={details[p.id]} onRetry={() => loadVariants(p.id)} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function VariantsPanel({ productId, state, onRetry }: { productId: number; state: VariantsState | undefined; onRetry: () => void }) {
  if (!state || state.status === "loading") return <p className="text-sm text-muted-foreground" role="status">Cargando variantes…</p>;
  if (state.status === "error") {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm" role="alert">
        <span className="text-destructive">{state.error}</span>
        <Button size="sm" variant="outline" onClick={onRetry}>Reintentar</Button>
      </div>
    );
  }
  if (state.variants.length === 0) return <p className="text-sm text-muted-foreground">Este producto no tiene variantes.</p>;

  return (
    <div className="space-y-2">
      <ul className="max-h-80 divide-y overflow-y-auto rounded-lg border bg-background">
        {state.variants.map((v) => (
          <li key={v.id} className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm", !v.isActive && "opacity-50")}>
            <span className="min-w-0 flex-1 font-medium tabular-nums">{v.label}</span>
            <span className="hidden font-mono text-xs text-muted-foreground md:inline">{v.sku}</span>
            <span className="tabular-nums">{v.retailPrice === null ? "Consultar" : formatArs(v.retailPrice)}</span>
            {v.isActive ? <AvailabilityBadge availability={v.availability} /> : <span className="text-xs">Desactivada</span>}
          </li>
        ))}
      </ul>
      <Link href={`/admin/productos/${productId}?tab=variantes`} className="inline-block text-sm font-medium hover:text-brand hover:underline">
        Editar variantes
      </Link>
    </div>
  );
}
