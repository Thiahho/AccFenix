import { Badge } from "@/components/ui/badge";
import { availabilityLabel, type Availability } from "@/lib/api";
import { cn } from "@/lib/utils";

export function AvailabilityBadge({ availability, className }: { availability: Availability; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        availability === "disponible"
          ? "border-emerald-600/30 bg-emerald-50 text-emerald-800"
          : "border-amber-600/30 bg-amber-50 text-amber-800",
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", availability === "disponible" ? "bg-emerald-600" : "bg-amber-600")} />
      {availabilityLabel[availability]}
    </Badge>
  );
}
