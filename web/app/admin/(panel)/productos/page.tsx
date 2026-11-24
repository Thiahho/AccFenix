import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { UrlTablePager, UrlTableToolbar, type TableFilter } from "@/components/admin/data-table";
import { PageHeader } from "@/components/admin/page-header";
import { ProductsTable } from "@/components/admin/products-table";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin/session";
import { firstParam, matchesSearch, paginate, parseTableParams, sortRows, type UrlParams } from "@/lib/admin/table";
import type { AdminCategory, AdminProductSummary } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Productos" };

const sortKeys = ["name", "category", "variants", "onRequest"] as const;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<UrlParams> }) {
  const params = await searchParams;
  const categoria = firstParam(params.categoria);
  const categoryId = Number(categoria);
  const validCategory = Number.isInteger(categoryId) && categoryId > 0;
  const [categories, products] = await Promise.all([
    adminFetch<AdminCategory[]>("/api/admin/categories"),
    adminFetch<AdminProductSummary[]>(`/api/admin/products${validCategory ? `?categoryId=${categoryId}` : ""}`),
  ]);

  const table = parseTableParams(params, sortKeys);
  const visibility = firstParam(params.visibilidad);
  const stock = firstParam(params.disponibilidad);
  const matching = products.filter(
    (p) =>
      (visibility !== "visible" || p.isActive) &&
      (visibility !== "oculto" || !p.isActive) &&
      (stock !== "a-pedido" || p.onRequestVariants > 0) &&
      (stock !== "disponible" || p.onRequestVariants === 0) &&
      matchesSearch(table.search, [p.name, p.slug, p.categoryName]),
  );
  const sortValue = (p: AdminProductSummary) =>
    table.sort === "category" ? p.categoryName : table.sort === "variants" ? p.activeVariants : table.sort === "onRequest" ? p.onRequestVariants : p.name;
  const sorted = table.sort ? sortRows(matching, sortValue, table.dir) : matching;
  const { rows, page, pages, total } = paginate(sorted, table.page, table.pageSize);

  const filters: TableFilter[] = [
    { param: "categoria", label: "Categoría", options: categories.map((c) => ({ value: String(c.id), label: c.name })) },
    { param: "visibilidad", label: "Visibilidad", options: [{ value: "visible", label: "Visibles" }, { value: "oculto", label: "Ocultos" }] },
    { param: "disponibilidad", label: "Disponibilidad", options: [{ value: "disponible", label: "Todo disponible" }, { value: "a-pedido", label: "Con variantes a pedido" }] },
  ];
  // Selection and open rows belong to the rows on screen: a new list starts clean.
  const tableKey = [categoria, visibility, stock, table.search, table.sort, table.dir, page, table.pageSize].join("|");

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

      <UrlTableToolbar placeholder="Buscar producto" filters={filters} />

      {rows.length === 0 ? (
        <p className="rounded-xl border bg-background p-8 text-center text-sm text-muted-foreground">No hay productos con estos filtros.</p>
      ) : (
        <ProductsTable key={tableKey} products={rows} />
      )}
      <UrlTablePager page={page} pages={pages} pageSize={table.pageSize} total={total} noun="productos" />
    </>
  );
}
