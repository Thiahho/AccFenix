"use client";

import { useState } from "react";
import { MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseQty } from "@/lib/qty";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  onChange: (qty: number) => void;
  max: number;
  /** Accessible name, e.g. "Cantidad de Huevos N°1". */
  label: string;
  id?: string;
  /** "sm" is compact from the `sm` breakpoint up; on phones every size keeps 44 px touch targets. */
  size?: "sm" | "md";
  className?: string;
};

/**
 * Quantity control: − / + buttons and a field that can be cleared while typing. Valid values are committed as they
 * are typed; an empty or invalid field goes back to the last valid quantity when it loses focus.
 */
export function QtyStepper({ value, onChange, max, label, id, size = "md", className }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const small = size === "sm";

  return (
    <div className={cn("flex items-center rounded-md border bg-background", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(small && "sm:size-8")}
        aria-label={`Restar uno (${label})`}
        disabled={value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
      >
        <MinusIcon />
      </Button>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={label}
        value={draft ?? String(value)}
        onChange={(e) => {
          setDraft(e.target.value);
          const qty = parseQty(e.target.value, max);
          if (qty !== null) onChange(qty);
        }}
        onBlur={() => setDraft(null)}
        onFocus={(e) => e.target.select()}
        className={cn(
          "border-0 text-center tabular-nums shadow-none focus-visible:ring-0",
          small ? "h-11 w-12 px-1 sm:h-8" : "h-11 w-16 md:h-9",
        )}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(small && "sm:size-8")}
        aria-label={`Sumar uno (${label})`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <PlusIcon />
      </Button>
    </div>
  );
}
