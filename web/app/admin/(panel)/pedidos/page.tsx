import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UrlSortHead, UrlTablePager, UrlTableToolbar, type TableFilter } from "@/components/admin/data-table";
import { OrderStatusBadge } from "@/components/admin/orders/order-status-badge";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatOrderDate, orderTotalLabel, ordersListPath, ordersPageHref, pageCount, parseOrdersQuery } from "@/lib/admin/orders";
import { adminFetch } from "@/lib/admin/session";
import type { UrlParams } from "@/lib/admin/table";
import type { AdminOrderPage } from "@/lib/admin/types";
import { customerTypeLabel, fulfillmentLabel, orderStatuses, orderStatusLabel, paymentStatusLabel } from "@/lib/orders/status";

export const metadata: Metadata = { title: "Pedidos" };

const options = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({ value, label }));

const filters: TableFilter[] = [
  { param: "estado", label: "Estado", options: orderStatuses.map((s) => ({ value: s, label: orderStatusLabel[s] })) },
  { param: "pago", label: "Pago", options: options(paymentStatusLabel) },
  { param: "entrega", label: "Entrega", options: options(fulfillmentLabel) },
];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<UrlParams> }) {
  const query = parseOrdersQuery(await searchParams);
  const data = await adminFetch<AdminOrderPage>(ordersListPath(query));
  const pages = pageCount(data.total, data.pageSize);
  // A filter or a deleted row can leave the URL past the last page.
  if (data.items.length === 0 && data.total > 0 && query.page > pages) redirect(ordersPageHref({ ...query, page: pages }));
  const filtered = Boolean(query.status || query.search || query.payment || query.fulfillment);

  return (
    <>
      <PageHeader title="Pedidos" description="Pedidos de la carta, con su estado de pago." />
      <UrlTableToolbar placeholder="Buscar por cliente o n.º" filters={filters} />

      <div className="overflow-hidden rounded-xl border bg-background">
        {data.items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">{filtered ? "No hay pedidos con estos filtros." : "No hay pedidos todavía."}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <UrlSortHead column="date" label="Pedido" />
                <UrlSortHead column="customer" label="Cliente" />
                <TableHead className="hidden md:table-cell">Entrega</TableHead>
                <UrlSortHead column="units" label="Productos" align="right" className="hidden sm:table-cell" />
                <UrlSortHead column="total" label="Total" align="right" />
                <UrlSortHead column="status" label="Estado" className="hidden sm:table-cell" />
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
                    <div className="mt-1 sm:hidden"><OrderStatusBadge status={o.status} /></div>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <span className="flex flex-wrap items-center gap-1.5">
                      {o.customerName}
                      <Badge variant={o.customerType === "business" ? "default" : "outline"}>{customerTypeLabel[o.customerType]}</Badge>
                      <Badge variant={o.paymentStatus === "approved" ? "default" : o.paymentStatus === "refunded" ? "destructive" : "secondary"}>{paymentStatusLabel[o.paymentStatus]}</Badge>
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {fulfillmentLabel[o.fulfillment]}
                    <span className="block text-xs">{o.timeSlot}</span>
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {o.itemCount} <span className="text-muted-foreground">({o.totalUnits} u.)</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">{orderTotalLabel(o)}</TableCell>
                  <TableCell className="hidden sm:table-cell"><OrderStatusBadge status={o.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <UrlTablePager page={Math.min(query.page, pages)} pages={pages} pageSize={data.pageSize} total={data.total} noun="pedidos" />
    </>
  );
}
