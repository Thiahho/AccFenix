import type { Metadata } from "next";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/admin/orders/order-status-badge";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatOrderDate, orderTotalLabel, ordersListPath, ordersPageHref, pageCount, parseOrdersQuery } from "@/lib/admin/orders";
import { adminFetch } from "@/lib/admin/session";
import type { AdminOrderPage } from "@/lib/admin/types";
import { customerTypeLabel, orderStatuses, orderStatusLabel, zoneLabel } from "@/lib/orders/status";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pedidos" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ pagina?: string; estado?: string }> }) {
  const query = parseOrdersQuery(await searchParams);
  const data = await adminFetch<AdminOrderPage>(ordersListPath(query));
  const pages = pageCount(data.total, data.pageSize);

  return (
    <>
      <PageHeader title="Pedidos" description="Pedidos enviados desde el sitio, con los precios vigentes al momento de pedir." />

      <nav aria-label="Filtrar por estado" className="mb-4 flex flex-wrap gap-2">
        {[undefined, ...orderStatuses].map((s) => {
          const active = s === query.status;
          return (
            <Link
              key={s ?? "all"}
              href={ordersPageHref({ page: 1, status: s })}
              aria-current={active ? "page" : undefined}
              className={cn("rounded-full border px-3 py-2 text-sm md:py-1", active ? "border-brand bg-brand text-brand-foreground" : "bg-background hover:bg-muted")}
            >
              {s ? orderStatusLabel[s] : "Todos"}
            </Link>
          );
        })}
      </nav>

      <div className="overflow-hidden rounded-xl border bg-background">
        {data.items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No hay pedidos{query.status ? " con este estado" : " todavía"}.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Zona</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Productos</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((o) => (
                <TableRow key={o.id} className="relative">
                  <TableCell>
                    <Link href={`/admin/pedidos/${o.id}`} className="font-medium tabular-nums after:absolute after:inset-0 hover:text-brand">
                      #{o.number}
                    </Link>
                    <p className="text-xs text-muted-foreground">{formatOrderDate(o.createdAt)}</p>
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-1.5">
                      {o.customerName}
                      <Badge variant={o.customerType === "business" ? "default" : "outline"}>{customerTypeLabel[o.customerType]}</Badge>
                      {o.isWholesale && <Badge variant="secondary">Mayorista</Badge>}
                    </span>
                    {o.businessName && <p className="text-xs text-muted-foreground">{o.businessName}</p>}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{zoneLabel[o.zone]}</TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {o.itemCount} <span className="text-muted-foreground">({o.totalUnits} u.)</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">{orderTotalLabel(o)}</TableCell>
                  <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {pages > 1 && (
        <nav aria-label="Páginas" className="mt-4 flex items-center justify-between gap-2 text-sm">
          <Button asChild variant="outline" size="sm" className={cn(query.page <= 1 && "pointer-events-none opacity-50")}>
            <Link href={ordersPageHref({ ...query, page: query.page - 1 })} aria-disabled={query.page <= 1}>Anterior</Link>
          </Button>
          <span className="text-muted-foreground tabular-nums">Página {query.page} de {pages} · {data.total} pedidos</span>
          <Button asChild variant="outline" size="sm" className={cn(query.page >= pages && "pointer-events-none opacity-50")}>
            <Link href={ordersPageHref({ ...query, page: query.page + 1 })} aria-disabled={query.page >= pages}>Siguiente</Link>
          </Button>
        </nav>
      )}
    </>
  );
}
