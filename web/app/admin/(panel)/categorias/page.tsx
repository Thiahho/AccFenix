import type { Metadata } from "next";
import Link from "next/link";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { deleteCategory } from "@/app/admin/actions";
import { CategoryDialog } from "@/components/admin/category-dialog";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { UrlSortHead, UrlTablePager, UrlTableToolbar, type TableFilter } from "@/components/admin/data-table";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminFetch } from "@/lib/admin/session";
import { firstParam, matchesSearch, paginate, parseTableParams, sortRows, type UrlParams } from "@/lib/admin/table";
import type { AdminAttribute, AdminCategory } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Categorías" };

const sortKeys = ["name", "products"] as const;
const filters: TableFilter[] = [
  { param: "visibilidad", label: "Visibilidad", options: [{ value: "visible", label: "Visibles" }, { value: "oculta", label: "Ocultas" }] },
];

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<UrlParams> }) {
  const params = await searchParams;
  const [categories, attributes] = await Promise.all([
    adminFetch<AdminCategory[]>("/api/admin/categories"),
    adminFetch<AdminAttribute[]>("/api/admin/attributes"),
  ]);
  const attrName = new Map(attributes.map((a) => [a.id, a.name]));
  const attributeList = (ids: AdminCategory["attributeIds"]) => ids.map((id) => attrName.get(id)).join(" → ") || "—";

  const table = parseTableParams(params, sortKeys);
  const visibility = firstParam(params.visibilidad);
  const matching = categories.filter(
    (c) =>
      (visibility !== "visible" || c.isActive) &&
      (visibility !== "oculta" || !c.isActive) &&
      matchesSearch(table.search, [c.name, c.slug, attributeList(c.attributeIds)]),
  );
  const sorted = table.sort ? sortRows(matching, (c) => (table.sort === "products" ? c.productCount : c.name), table.dir) : matching;
  const { rows, page, pages, total } = paginate(sorted, table.page, table.pageSize);

  return (
    <div>
      <PageHeader
        title="Categorías"
        description="Cada categoría define qué atributos tienen sus productos."
        actions={<CategoryDialog attributes={attributes} trigger={<Button><PlusIcon /> Nueva categoría</Button>} />}
      />
      <UrlTableToolbar placeholder="Buscar categoría o atributo" filters={filters} />
      <div className="overflow-hidden rounded-xl border bg-background">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">{categories.length === 0 ? "Todavía no hay categorías." : "No hay categorías con estos filtros."}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <UrlSortHead column="name" label="Nombre" />
                <TableHead className="hidden sm:table-cell">Atributos</TableHead>
                <UrlSortHead column="products" label="Productos" align="right" />
                <TableHead className="w-24"><span className="sr-only">Acciones</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="whitespace-normal">
                    <span className="font-medium">{c.name}</span>
                    {!c.isActive && <Badge variant="secondary" className="ml-2">Oculta</Badge>}
                    <p className="text-xs text-muted-foreground">/catalogo/{c.slug}</p>
                    <p className="mt-1 text-xs text-muted-foreground sm:hidden">{attributeList(c.attributeIds)}</p>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{attributeList(c.attributeIds)}</TableCell>
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
        )}
      </div>
      <UrlTablePager page={page} pages={pages} pageSize={table.pageSize} total={total} noun="categorías" />
    </div>
  );
}
