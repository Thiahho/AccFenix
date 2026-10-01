"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 250;

type Props<T> = Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "role"> & {
  value: string;
  onValueChange: (value: string) => void;
  /** Busca sugerencias para lo escrito; si falla, el campo sigue funcionando como texto libre. */
  search: (query: string, signal: AbortSignal) => Promise<T[]>;
  onPick: (item: T) => void;
  itemKey: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  minChars?: number;
};

/** Input de texto libre con sugerencias mientras se escribe. */
export function SuggestInput<T>({ value, onValueChange, search, onPick, itemKey, renderItem, minChars = 3, onKeyDown, onBlur, ...props }: Props<T>) {
  const listId = useId();
  const [items, setItems] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const request = useRef<AbortController>(undefined);

  const cancel = () => {
    clearTimeout(timer.current);
    request.current?.abort();
  };
  useEffect(() => cancel, []);

  function handleChange(text: string) {
    onValueChange(text);
    cancel();
    if (text.trim().length < minChars) {
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      const ctrl = new AbortController();
      request.current = ctrl;
      try {
        const found = await search(text.trim(), ctrl.signal);
        if (ctrl.signal.aborted) return;
        setItems(found);
        setActive(-1);
        setOpen(found.length > 0);
      } catch {
        if (!ctrl.signal.aborted) setOpen(false);
      }
    }, DEBOUNCE_MS);
  }

  function pick(item: T) {
    cancel();
    setOpen(false);
    onPick(item);
  }

  function move(to: number) {
    const next = (to + items.length) % items.length;
    setActive(next);
    document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: "nearest" });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === "Enter") {
      // Enter elige una sugerencia; nunca envía el formulario desde este campo.
      e.preventDefault();
      if (open && items.length > 0) pick(items[Math.max(0, active)]);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(active + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(active <= 0 ? items.length - 1 : active - 1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <Input
        {...props}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && items[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={(e) => {
          cancel();
          setOpen(false);
          onBlur?.(e);
        }}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full right-0 left-0 z-30 mt-1 max-h-64 overflow-y-auto overscroll-contain rounded-lg bg-popover p-1.5 text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          {items.map((item, i) => (
            <li
              key={itemKey(item)}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // Evita que el input pierda el foco (y cierre la lista) antes de registrar el clic.
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => pick(item)}
              onPointerMove={() => setActive(i)}
              className={cn("flex min-h-11 cursor-pointer flex-col justify-center rounded-md px-3 py-1.5 text-base select-none sm:min-h-9 sm:text-sm", i === active && "bg-brand-soft")}
            >
              {renderItem(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
