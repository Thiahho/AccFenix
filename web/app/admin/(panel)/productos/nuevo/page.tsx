import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { adminFetch } from "@/lib/admin/session";
import type { AdminAttribute, AdminCategory } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  const [categories, attributes] = await Promise.all([
    adminFetch<AdminCategory[]>("/api/admin/categories"),
    adminFetch<AdminAttribute[]>("/api/admin/attributes"),
  ]);

  return (
    <div className="max-w-3xl">
      <Link href="/admin/productos" className="text-sm text-muted-foreground hover:text-foreground">← Productos</Link>
      <PageHeader title="Nuevo producto" description="Elegí la categoría y los valores habilitados; las variantes se generan solas." />
      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Primero creá una <Link href="/admin/categorias" className="text-brand underline">categoría</Link>.
        </p>
      ) : (
        <ProductForm categories={categories} attributes={attributes} />
      )}
    </div>
  );
}
