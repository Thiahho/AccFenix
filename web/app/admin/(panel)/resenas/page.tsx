import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { deleteReview } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { UrlSortHead, UrlTablePager, UrlTableToolbar } from "@/components/admin/data-table";
import { PageHeader } from "@/components/admin/page-header";
import { ReviewDialog } from "@/components/admin/review-dialog";
import { TestimonialManager } from "@/components/admin/testimonial-manager";
import { Stars } from "@/components/site/product-facts";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatOrderDate } from "@/lib/admin/orders";
import { adminFetch } from "@/lib/admin/session";
import { matchesSearch, paginate, parseTableParams, sortRows, type UrlParams } from "@/lib/admin/table";
import type { AdminReview, AdminTestimonial } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Reseñas" };

const sortKeys = ["date", "rating"] as const;

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<UrlParams> }) {
  const params = await searchParams;
  // The API lists reviews newest first, and screenshots in their gallery order.
  const [reviews, testimonials] = await Promise.all([
    adminFetch<AdminReview[]>("/api/admin/reviews"),
    adminFetch<AdminTestimonial[]>("/api/admin/testimonials"),
  ]);
  const tab = params.tab === "capturas" ? "capturas" : "verificadas";

  const table = parseTableParams(params, sortKeys);
  const matching = reviews.filter((r) => matchesSearch(table.search, [r.productName, r.authorName, r.comment, `#${r.orderNumber}`]));
  const sorted = table.sort ? sortRows(matching, (r) => (table.sort === "rating" ? r.rating : r.createdAt), table.dir) : matching;
  const { rows, page, pages, total } = paginate(sorted, table.page, table.pageSize);

  return (
    <div>
      <PageHeader
        title="Reseñas"
        description="Las reseñas de compras verificadas que se publican en cada producto, y las capturas de mensajes de clientes del inicio."
        actions={<ReviewDialog trigger={<Button><PlusIcon /> Registrar reseña</Button>} />}
      />
      <Tabs defaultValue={tab}>
        <TabsList className="w-full group-data-horizontal/tabs:h-11 sm:w-fit md:group-data-horizontal/tabs:h-8">
          <TabsTrigger value="verificadas">Compras verificadas</TabsTrigger>
          <TabsTrigger value="capturas">Capturas</TabsTrigger>
        </TabsList>
        <TabsContent value="verificadas" className="mt-4">
          <UrlTableToolbar placeholder="Buscar producto, autor, comentario o #pedido" />
          <div className="overflow-hidden rounded-xl border bg-background">
            {rows.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                {reviews.length === 0 ? "Todavía no hay reseñas. Cuando un cliente deje una, o la registres vos, aparece acá." : "No hay reseñas con esta búsqueda."}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reseña</TableHead>
                    <UrlSortHead column="rating" label="Puntuación" className="hidden sm:table-cell" defaultDir="desc" />
                    <TableHead className="hidden md:table-cell">Pedido</TableHead>
                    <UrlSortHead column="date" label="Fecha" className="hidden md:table-cell" defaultDir="desc" />
                    <TableHead className="w-14"><span className="sr-only">Acciones</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-normal">
                        <Link href={`/producto/${r.productSlug}`} target="_blank" className="font-medium hover:text-brand hover:underline">{r.productName}</Link>
                        <Stars rating={r.rating} className="mt-1 flex sm:hidden" />
                        {r.comment && <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{r.comment}</p>}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {r.authorName}
                          <span className="md:hidden"> · #{r.orderNumber} · {formatOrderDate(r.createdAt)}</span>
                        </p>
                      </TableCell>
                      <TableCell className="hidden align-top sm:table-cell"><Stars rating={r.rating} /></TableCell>
                      <TableCell className="hidden align-top tabular-nums md:table-cell">
                        <Link href={`/admin/pedidos?q=${r.orderNumber}`} className="hover:text-brand hover:underline">#{r.orderNumber}</Link>
                      </TableCell>
                      <TableCell className="hidden align-top text-sm text-muted-foreground tabular-nums md:table-cell">{formatOrderDate(r.createdAt)}</TableCell>
                      <TableCell className="align-top">
                        <div className="flex justify-end">
                          <ConfirmButton
                            size="icon"
                            label={`Eliminar la reseña de ${r.authorName} sobre ${r.productName}`}
                            title="¿Eliminar esta reseña?"
                            description={`Se deja de mostrar en “${r.productName}”. El cliente podrá volver a dejarla desde el link de su pedido.`}
                            action={deleteReview.bind(null, r.id)}
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
          <UrlTablePager page={page} pages={pages} pageSize={table.pageSize} total={total} noun="reseñas" />
        </TabsContent>
        <TabsContent value="capturas" className="mt-4">
          <TestimonialManager testimonials={testimonials} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
