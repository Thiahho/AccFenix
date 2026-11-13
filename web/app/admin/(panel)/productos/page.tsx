import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ProductsTable } from "@/components/admin/products-table";
import { Button } from "@/components/ui/button";
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
              className={cn("rounded-full border px-3 py-2 text-sm md:py-1", active ? "border-brand bg-brand text-brand-foreground" : "bg-background hover:bg-muted")}
            >
              {c.name}
            </Link>
          );
        })}
      </nav>

      {products.length === 0 ? (
        <p className="rounded-xl border bg-background p-8 text-center text-sm text-muted-foreground">No hay productos en esta categoría.</p>
      ) : (
        <ProductsTable key={categoria ?? "all"} products={products} />
      )}
    </>
  );
}
