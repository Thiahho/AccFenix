import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPinIcon } from "lucide-react";
import { OrderStatusBadge } from "@/components/admin/orders/order-status-badge";
import { OrderStatusForm } from "@/components/admin/orders/order-status-form";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatOrderDate, orderTotalLabel, whatsappChatHref } from "@/lib/admin/orders";
import { adminFetch, AdminApiError } from "@/lib/admin/session";
import type { AdminOrder } from "@/lib/admin/types";
import { mapsLink } from "@/lib/maps-url";
import { customerTypeLabel, zoneLabel } from "@/lib/orders/status";
import { formatArs } from "@/lib/pricing";

export const metadata: Metadata = { title: "Pedido" };

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId < 1) notFound();

  const order = await adminFetch<AdminOrder>(`/api/admin/orders/${orderId}`).catch((e) => {
    if (e instanceof AdminApiError && e.status === 404) notFound();
    throw e;
  });
  const hasLocation = order.latitude !== null && order.longitude !== null;
  const chatHref = whatsappChatHref(order.phone);

  return (
    <div className="max-w-4xl">
      <Link href="/admin/pedidos" className="text-sm text-muted-foreground hover:text-foreground">← Pedidos</Link>
      <PageHeader
        title={`Pedido #${order.number}`}
        description={formatOrderDate(order.createdAt)}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={order.customerType === "business" ? "default" : "outline"}>{customerTypeLabel[order.customerType]}</Badge>
            {order.isWholesale && <Badge variant="secondary">Mayorista</Badge>}
            <OrderStatusBadge status={order.status} />
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="cliente" className="rounded-xl border bg-background p-5">
          <h2 id="cliente" className="font-semibold">Cliente</h2>
          <dl className="mt-3 grid gap-3 text-sm">
            <Detail label="Tipo">{customerTypeLabel[order.customerType]}</Detail>
            <Detail label="Nombre">{order.customerName}</Detail>
            <Detail label="Teléfono">
              {order.phone ? (
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <a href={`tel:${order.phone}`} className="hover:text-brand">{order.phone}</a>
                  {chatHref && (
                    <a href={chatHref} target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline-offset-2 hover:underline">
                      Abrir chat
                    </a>
                  )}
                </span>
              ) : (
                <span className="text-muted-foreground">— (llegó por WhatsApp)</span>
              )}
            </Detail>
            {order.comments && <Detail label="Comentarios"><span className="whitespace-pre-line">{order.comments}</span></Detail>}
          </dl>
        </section>

        <section aria-labelledby="entrega" className="rounded-xl border bg-background p-5">
          <h2 id="entrega" className="font-semibold">Entrega</h2>
          <dl className="mt-3 grid gap-3 text-sm">
            <Detail label="Zona">{zoneLabel[order.zone]}</Detail>
            {order.zone === "buenosAires" ? (
              <>
                <Detail label="Localidad">{order.locality}</Detail>
                <Detail label="Dirección">
                  {order.address}
                  {hasLocation && (
                    <a
                      href={mapsLink({ lat: order.latitude!, lng: order.longitude! })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 inline-flex items-center gap-1 font-medium text-brand hover:underline"
                    >
                      <MapPinIcon aria-hidden className="size-3.5" /> Ver en Maps
                    </a>
                  )}
                </Detail>
              </>
            ) : (
              <>
                <Detail label="Provincia">{order.province}</Detail>
                <Detail label="Expreso">{order.carrier}</Detail>
              </>
            )}
          </dl>
        </section>
      </div>

      <section aria-labelledby="productos" className="mt-4 overflow-hidden rounded-xl border bg-background">
        <h2 id="productos" className="sr-only">Productos</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="hidden sm:table-cell">SKU</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Precio</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="whitespace-normal">
                  <p className="font-medium">{i.productName}</p>
                  <p className="text-xs text-muted-foreground">{i.variantLabel}</p>
                </TableCell>
                <TableCell className="hidden font-mono text-xs sm:table-cell">{i.sku}</TableCell>
                <TableCell className="text-right tabular-nums">{i.quantity}</TableCell>
                <TableCell className="hidden text-right tabular-nums whitespace-nowrap sm:table-cell">
                  {i.unitPrice === null ? <span className="text-muted-foreground">Consultar</span> : formatArs(i.unitPrice)}
                </TableCell>
                <TableCell className="text-right tabular-nums whitespace-nowrap">
                  {i.subtotal === null ? <span className="text-muted-foreground">Consultar</span> : formatArs(i.subtotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} className="font-medium whitespace-normal">
                Total <span className="font-normal text-muted-foreground">(precios {order.isWholesale ? "mayoristas" : "minoristas"}, sin envío)</span>
              </TableCell>
              <TableCell colSpan={3} className="text-right font-semibold tabular-nums whitespace-nowrap">{orderTotalLabel(order)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </section>

      <section aria-labelledby="estado" className="mt-4 rounded-xl border bg-background p-5">
        <h2 id="estado" className="sr-only">Cambiar estado</h2>
        <OrderStatusForm key={order.status} orderId={order.id} status={order.status} />
      </section>
    </div>
  );
}
