"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { deleteProducts } from "@/app/admin/actions";
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

const plural = (n: number) => (n === 1 ? "1 producto" : `${n} productos`);

/**
 * Product grid with row selection and bulk delete. Selection only covers the listed products;
 * the page remounts this component (via `key`) when the category filter changes, which resets it.
 */
export function ProductsTable({ products }: { products: AdminProductSummary[] }) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [pending, startTransition] = useTransition();

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
                aria-label="Seleccionar todos los productos listados"
              />
            </TableHead>
            <TableHead className="w-16"><span className="sr-only">Foto</span></TableHead>
            <TableHead>Producto</TableHead>
            <TableHead className="hidden sm:table-cell">Categoría</TableHead>
            <TableHead className="text-right">Variantes</TableHead>
            <TableHead className="hidden text-right sm:table-cell">A pedido</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => (
            <TableRow key={p.id} className="relative" data-state={selected.has(p.id) ? "selected" : undefined}>
              {/* Above the row's stretched link, so clicking the checkbox does not navigate. */}
              <TableCell className="relative z-10">
                <Checkbox
                  checked={selected.has(p.id)}
                  onCheckedChange={(v) => toggle(p.id, v === true)}
                  disabled={pending}
                  aria-label={`Seleccionar ${p.name}`}
                />
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
