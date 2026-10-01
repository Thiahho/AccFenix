import type { Metadata } from "next";
import Link from "next/link";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { deleteCategory } from "@/app/admin/actions";
import { CategoryDialog } from "@/components/admin/category-dialog";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminFetch } from "@/lib/admin/session";
import type { AdminAttribute, AdminCategory } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Categorías" };

export default async function CategoriesPage() {
  const [categories, attributes] = await Promise.all([
    adminFetch<AdminCategory[]>("/api/admin/categories"),
    adminFetch<AdminAttribute[]>("/api/admin/attributes"),
  ]);
  const attrName = new Map(attributes.map((a) => [a.id, a.name]));

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Categorías"
        description="Cada categoría define qué atributos tienen sus productos."
        actions={<CategoryDialog attributes={attributes} trigger={<Button><PlusIcon /> Nueva categoría</Button>} />}
      />
      <div className="overflow-hidden rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Atributos</TableHead>
              <TableHead className="text-right">Productos</TableHead>
              <TableHead className="w-24"><span className="sr-only">Acciones</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <span className="font-medium">{c.name}</span>
                  {!c.isActive && <Badge variant="secondary" className="ml-2">Oculta</Badge>}
                  <p className="text-xs text-muted-foreground">/catalogo/{c.slug}</p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.attributeIds.map((id) => attrName.get(id)).join(" → ") || "—"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <Link href={`/admin/productos?categoria=${c.id}`} className="hover:text-brand hover:underline">{c.productCount}</Link>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <CategoryDialog
                      category={c}
                      attributes={attributes}
                      trigger={<Button size="icon" variant="ghost" aria-label={`Editar ${c.name}`}><PencilIcon /></Button>}
                    />
                    <ConfirmButton
                      size="icon"
                      label={`Eliminar ${c.name}`}
                      title={`¿Eliminar “${c.name}”?`}
                      description="Solo se puede eliminar una categoría sin productos."
                      action={deleteCategory.bind(null, c.id)}
                    >
                      <Trash2Icon />
                    </ConfirmButton>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
