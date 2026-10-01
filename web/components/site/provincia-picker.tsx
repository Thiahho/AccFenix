"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { CheckIcon, ChevronDownIcon, SearchIcon, XIcon } from "lucide-react";
import { DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { filterProvincias, provincias } from "@/lib/provincias";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

type Props = {
  value?: string;
  onChange: (value: string) => void;
} & Pick<React.ComponentProps<"button">, "id" | "aria-invalid" | "aria-describedby">;

/** Selector de provincia con buscador: popover bajo el campo en escritorio, hoja inferior en móvil. */
export function ProvinciaPicker({ value, onChange, ...triggerProps }: Props) {
  const [open, setOpen] = useState(false);
  const desktop = useMediaQuery("(min-width: 640px)");
  const sheetRef = useRef<HTMLDivElement>(null);

  const pick = (provincia: string) => {
    onChange(provincia);
    setOpen(false);
  };

  const trigger = (
    <button
      type="button"
      aria-label={value ? `Provincia: ${value}` : "Provincia: elegí tu provincia"}
      className="flex h-11 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:h-8"
      {...triggerProps}
    >
      <span className={cn("truncate", !value && "text-muted-foreground")}>{value ?? "Elegí tu provincia"}</span>
      <ChevronDownIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );

  if (desktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-64 overflow-hidden p-0">
          <ProvinciaList value={value} onPick={pick} listClassName="max-h-72" />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPortal>
        <DialogOverlay className="bg-black/30" />
        <DialogPrimitive.Content
          ref={sheetRef}
          aria-describedby={undefined}
          // Sin foco en el buscador al abrir: el teclado taparía la lista.
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            sheetRef.current?.focus();
          }}
          className="fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-2xl bg-popover pb-[env(safe-area-inset-bottom)] text-popover-foreground shadow-[0_-12px_40px_rgb(0_0_0/0.18)] duration-200 outline-none data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom"
        >
          <span aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" />
          <div className="flex items-center justify-between pr-1 pl-4">
            <DialogPrimitive.Title className="font-display text-lg font-semibold tracking-tight">Elegí tu provincia</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Cerrar"
              className="grid size-11 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <XIcon aria-hidden className="size-5" />
            </DialogPrimitive.Close>
          </div>
          <ProvinciaList value={value} onPick={pick} listClassName="max-h-[60dvh]" />
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}

function ProvinciaList({ value, onPick, listClassName }: { value?: string; onPick: (provincia: string) => void; listClassName?: string }) {
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(() => Math.max(0, provincias.findIndex((p) => p === value)));
  const results = filterProvincias(query);

  // Al abrir, deja la provincia elegida a la vista.
  useEffect(() => {
    const list = listRef.current;
    const selected = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (list && selected) list.scrollTop = selected.offsetTop - (list.clientHeight - selected.offsetHeight) / 2;
  }, []);

  function move(to: number) {
    if (results.length === 0) return;
    const next = Math.min(results.length - 1, Math.max(0, to));
    setActive(next);
    document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: "nearest" });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(active + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(active - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      move(0);
    } else if (e.key === "End") {
      e.preventDefault();
      move(results.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) onPick(results[active]);
    }
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="relative border-b">
        <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
          aria-autocomplete="list"
          aria-label="Buscar provincia"
          placeholder="Buscar provincia…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            if (listRef.current) listRef.current.scrollTop = 0;
          }}
          onKeyDown={onKeyDown}
          className="h-12 w-full bg-transparent pr-12 pl-10 text-base outline-none placeholder:text-muted-foreground sm:h-10 sm:text-sm"
        />
        {query && (
          <button
            type="button"
            aria-label="Borrar búsqueda"
            onClick={() => {
              setQuery("");
              setActive(0);
            }}
            className="absolute top-1/2 right-0.5 grid size-11 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:size-9"
          >
            <XIcon aria-hidden className="size-4" />
          </button>
        )}
      </div>

      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label="Provincias"
        className={cn(
          "relative overflow-y-auto overscroll-contain px-1.5 motion-safe:scroll-smooth py-3 [mask-image:linear-gradient(to_bottom,transparent,black_0.75rem,black_calc(100%-0.75rem),transparent)]",
          listClassName,
        )}
      >
        {results.map((p, i) => (
          <li
            key={p}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={p === value}
            onClick={() => onPick(p)}
            onPointerMove={() => setActive(i)}
            className={cn(
              "flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md px-3 text-base select-none sm:min-h-9 sm:text-sm",
              i === active && "bg-brand-soft",
              p === value && "font-medium text-brand",
            )}
          >
            {p}
            {p === value && <CheckIcon aria-hidden className="size-4 shrink-0" />}
          </li>
        ))}
        {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">No encontramos esa provincia</li>}
      </ul>
    </div>
  );
}
