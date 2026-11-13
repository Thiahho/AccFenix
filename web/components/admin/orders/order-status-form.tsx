"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateOrderStatus } from "@/app/admin/(panel)/pedidos/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isOrderStatus, orderStatuses, orderStatusLabel } from "@/lib/orders/status";
import type { OrderStatus } from "@/lib/orders/types";

export function OrderStatusForm({ orderId, status }: { orderId: number; status: OrderStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [next, setNext] = useState<OrderStatus>(status);

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await updateOrderStatus(orderId, next);
          if (res.ok) {
            toast.success(`Pedido marcado como ${orderStatusLabel[next].toLowerCase()}`);
            router.refresh();
          } else toast.error(res.error);
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="order-status">Estado</Label>
        <Select value={next} onValueChange={(v) => isOrderStatus(v) && setNext(v)}>
          <SelectTrigger id="order-status" className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {orderStatuses.map((s) => (
              <SelectItem key={s} value={s}>{orderStatusLabel[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={pending || next === status}>{pending ? "Guardando…" : "Cambiar estado"}</Button>
    </form>
  );
}
