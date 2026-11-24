"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableHead } from "@/components/ui/table";
import { DEFAULT_PAGE_SIZE, MAX_SEARCH_LENGTH, nextSort, PAGE_SIZES, type SortDir } from "@/lib/admin/table";
import { cn } from "@/lib/utils";

const ALL = "__all";
const SEARCH_DELAY_MS = 300;

export type TableFilter = { param: string; label: string; options: { value: string; label: string }[] };

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative min-w-0 flex-1 sm:max-w-xs">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input type="search" aria-label={placeholder} placeholder={placeholder} maxLength={MAX_SEARCH_LENGTH} value={value} onChange={(e) => onChange(e.target.value)} className="w-full pl-8" />
    </div>
  );
}

export function PageSizeSelect({ value, onChange }: { value: number; onChange: (size: number) => void }) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger aria-label="Registros por página" className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PAGE_SIZES.map((size) => <SelectItem key={size} value={String(size)}>{size} / pág.</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function SortHead({ label, active, dir, onSort, className, align = "left" }: { label: string; active: boolean; dir: SortDir; onSort: () => void; className?: string; align?: "left" | "right" }) {
  const Icon = !active ? ChevronsUpDownIcon : dir === "asc" ? ArrowUpIcon : ArrowDownIcon;
  return (
    <TableHead className={cn(align === "right" && "text-right", className)} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={onSort} className={cn("inline-flex min-h-8 items-center gap-1 rounded-sm hover:text-brand focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", align === "right" && "flex-row-reverse")}>
        {label}
        <Icon className={cn("size-3.5", !active && "text-muted-foreground/60")} aria-hidden />
      </button>
    </TableHead>
  );
}

export function TablePager({ page, pages, pageSize, total, onPage, noun }: { page: number; pages: number; pageSize: number; total: number; onPage: (page: number) => void; noun: string }) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <nav aria-label="Páginas" className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground tabular-nums" aria-live="polite">{from}–{to} de {total} {noun}</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-11 md:h-7" disabled={page <= 1} onClick={() => onPage(page - 1)}>Anterior</Button>
        <span className="text-muted-foreground tabular-nums">{page} / {pages}</span>
        <Button variant="outline" size="sm" className="h-11 md:h-7" disabled={page >= pages} onClick={() => onPage(page + 1)}>Siguiente</Button>
      </div>
    </nav>
  );
}

/** Updates the list URL; any change except moving between pages goes back to the first page. */
function useTableUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(patch: Record<string, string | undefined>, keepPage = false) {
    const next = new URLSearchParams(params.toString());
    if (!keepPage) next.delete("pagina");
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return { params, pending, update };
}

export function UrlTableToolbar({ placeholder, filters = [] }: { placeholder: string; filters?: TableFilter[] }) {
  const { params, pending, update } = useTableUrl();
  const urlSearch = params.get("q") ?? "";
  const [text, setText] = useState(urlSearch);
  const [seenSearch, setSeenSearch] = useState(urlSearch);
  const [sentSearch, setSentSearch] = useState(urlSearch);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Follow URL changes from elsewhere (back button), but never overwrite what is still being typed.
  if (urlSearch !== seenSearch) {
    setSeenSearch(urlSearch);
    if (urlSearch !== sentSearch) {
      setText(urlSearch);
      setSentSearch(urlSearch);
    }
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  function onSearch(value: string) {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const search = value.trim();
      setSentSearch(search);
      update({ q: search || undefined });
    }, SEARCH_DELAY_MS);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2" aria-busy={pending}>
      <SearchBox value={text} onChange={onSearch} placeholder={placeholder} />
      {filters.map((filter) => (
        <Select key={filter.param} value={params.get(filter.param) ?? ALL} onValueChange={(v) => update({ [filter.param]: v === ALL ? undefined : v })}>
          <SelectTrigger aria-label={filter.label} className="min-w-36 flex-1 sm:flex-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{filter.label}: todos</SelectItem>
            {filter.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      ))}
      <div className="ml-auto">
        <PageSizeSelect
          value={Number(params.get("por")) || DEFAULT_PAGE_SIZE}
          onChange={(size) => update({ por: size === DEFAULT_PAGE_SIZE ? undefined : String(size) })}
        />
      </div>
    </div>
  );
}

export function UrlSortHead({ column, label, className, align, defaultDir = "asc" }: { column: string; label: string; className?: string; align?: "left" | "right"; defaultDir?: SortDir }) {
  const { params, update } = useTableUrl();
  const current = params.get("orden") ?? undefined;
  const dir: SortDir = params.get("dir") === "desc" ? "desc" : params.get("dir") === "asc" ? "asc" : defaultDir;
  return (
    <SortHead
      label={label}
      active={current === column}
      dir={dir}
      className={className}
      align={align}
      onSort={() => {
        const next = nextSort(current, current === column ? dir : "asc", column);
        update({ orden: next.sort, dir: next.sort ? next.dir : undefined });
      }}
    />
  );
}

export function UrlTablePager({ page, pages, pageSize, total, noun }: { page: number; pages: number; pageSize: number; total: number; noun: string }) {
  const { update } = useTableUrl();
  return <TablePager page={page} pages={pages} pageSize={pageSize} total={total} noun={noun} onPage={(p) => update({ pagina: p > 1 ? String(p) : undefined }, true)} />;
}
