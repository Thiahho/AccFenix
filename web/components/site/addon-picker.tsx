"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Addon } from "@/lib/api";
import { formatArs } from "@/lib/pricing";

/** Optional extras: none, one or several, each adding its own price to the unit. */
export function AddonPicker({ addons, selected, onChange }: { addons: Addon[]; selected: number[]; onChange: (ids: number[]) => void }) {
  if (addons.length === 0) return null;
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold text-muted-foreground">Extras (opcional)</legend>
      <div className="grid gap-1.5">
        {addons.map((addon) => {
          const checked = selected.includes(addon.id);
          return (
            <Label
              key={addon.id}
              className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-xl border border-border px-3 text-sm font-semibold transition-colors hover:bg-oat has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/12"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(on) => onChange(on === true ? [...selected, addon.id] : selected.filter((id) => id !== addon.id))}
                />
                {addon.label}
              </span>
              <span className="poster-price shrink-0 text-sm text-caramel-deep">+ {formatArs(addon.price)}</span>
            </Label>
          );
        })}
      </div>
    </fieldset>
  );
}
