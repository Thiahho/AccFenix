import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLinkIcon } from "lucide-react";
import { deleteProduct } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { MediaManager } from "@/components/admin/media-manager";
import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { VariantsGrid } from "@/components/admin/variants-grid";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminFetch, AdminApiError } from "@/lib/admin/session";
import type { AdminAttribute, AdminCategory, AdminProduct } from "@/lib/admin/types";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> };

export const metadata: Metadata = { title: "Producto" };

export default async function ProductEditPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab = "variantes" } = await searchParams;
  const productId = Number(id);
  if (!Number.isInteger(productId)) notFound();

  const product = await adminFetch<AdminProduct>(`/api/admin/products/${productId}`).catch((e) => {
    if (e instanceof AdminApiError && e.status === 404) notFound();
    throw e;
  });
  const [categories, attributes] = await Promise.all([
    adminFetch<AdminCategory[]>("/api/admin/categories"),
    adminFetch<AdminAttribute[]>("/api/admin/attributes"),
  ]);
  // Remonta la grilla cuando cambian las variantes en el servidor (p. ej. tras regenerarlas).
  const variantsKey = product.variants.map((v) => `${v.id}${v.availability[0]}${v.isActive ? 1 : 0}`).join(",");

  return (
    <div className="max-w-5xl">
      <Link href="/admin/productos" className="text-sm text-muted-foreground hover:text-foreground">← Productos</Link>
      <PageHeader
        title={product.name}
        description={`${product.variants.filter((v) => v.isActive).length} variantes activas`}
        actions={
          <>
            {product.isActive && (
              <Button asChild variant="outline">
                <Link href={`/producto/${product.slug}`} target="_blank"><ExternalLinkIcon /> Ver en el sitio</Link>
              </Button>
            )}
            <ConfirmButton
              label="Eliminar producto"
              title={`¿Eliminar “${product.name}”?`}
              description="Se borran el producto, sus variantes y sus fotos. Si solo querés ocultarlo, desactivá “Visible en el sitio”."
              action={deleteProduct.bind(null, product.id)}
            />
          </>
        }
      />

      <Tabs defaultValue={tab}>
        <TabsList>
          <TabsTrigger value="variantes">Variantes</TabsTrigger>
          <TabsTrigger value="datos">Datos</TabsTrigger>
          <TabsTrigger value="media">Fotos y videos</TabsTrigger>
        </TabsList>
        <TabsContent value="variantes" className="mt-4">
          <VariantsGrid key={variantsKey} product={product} />
        </TabsContent>
        <TabsContent value="datos" className="mt-4">
          <ProductForm categories={categories} attributes={attributes} product={product} />
        </TabsContent>
        <TabsContent value="media" className="mt-4">
          <MediaManager product={product} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
