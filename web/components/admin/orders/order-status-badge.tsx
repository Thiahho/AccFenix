import { orderStatusLabel } from "@/lib/orders/status";
import type { OrderStatus } from "@/lib/orders/types";
import { cn } from "@/lib/utils";

const tone: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-900",
  confirmed: "bg-sky-100 text-sky-900",
  outForDelivery: "bg-violet-100 text-violet-900",
  delivered: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-muted text-muted-foreground line-through",
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span className={cn("inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", tone[status], className)}>
      {orderStatusLabel[status]}
    </span>
  );
}
