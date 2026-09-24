import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ProductImage } from "@/components/site/product-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminFetch } from "@/lib/admin/session";
import type { AdminCategory, AdminProductSummary } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Productos" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ categoria?: string }> }) {
  const { categoria } = await searchParams;
  const [categories, products] = await Promise.all([
    adminFetch<AdminCategory[]>("/api/admin/categories"),
    adminFetch<AdminProductSummary[]>(`/api/admin/products${categoria ? `?categoryId=${Number(categoria)}` : ""}`),
  ]);

  return (
    <>
      <PageHeader
        title="Productos"
        description="Cada producto genera una variante por combinación de atributos."
        actions={
          <Button asChild>
            <Link href="/admin/productos/nuevo"><PlusIcon /> Nuevo producto</Link>
          </Button>
        }
      />

      <nav aria-label="Filtrar por categoría" className="mb-4 flex flex-wrap gap-2">
        {[{ id: undefined, name: "Todas" }, ...categories].map((c) => {
          const active = String(c.id ?? "") === (categoria ?? "");
          return (
            <Link
              key={c.id ?? "all"}
              href={c.id ? `/admin/productos?categoria=${c.id}` : "/admin/productos"}
              aria-current={active ? "page" : undefined}
              className={cn("rounded-full border px-3 py-1 text-sm", active ? "border-brand bg-brand text-brand-foreground" : "bg-background hover:bg-muted")}
            >
              {c.name}
            </Link>
          );
        })}
      </nav>

      <div className="overflow-hidden rounded-xl border bg-background">
        {products.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No hay productos en esta categoría.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16"><span className="sr-only">Foto</span></TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="hidden sm:table-cell">Categoría</TableHead>
                <TableHead className="text-right">Variantes</TableHead>
                <TableHead className="hidden text-right sm:table-cell">A pedido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id} className="relative">
                  <TableCell>
                    <ProductImage src={p.coverUrl} alt="" className="size-10 rounded-md" sizes="40px" />
                  </TableCell>
                  <TableCell>
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
        )}
      </div>
    </>
  );
}
