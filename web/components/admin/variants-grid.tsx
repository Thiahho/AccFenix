"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";
import { toast } from "sonner";
import { bulkAvailability, saveVariantPrices, setVariant } from "@/app/admin/actions";
import { PageSizeSelect, SearchBox, SortHead, TablePager } from "@/components/admin/data-table";
import { AvailabilityBadge } from "@/components/site/availability-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Availability } from "@/lib/api";
import { DEFAULT_PAGE_SIZE, matchesSearch, nextSort, paginate, sortRows, type SortDir } from "@/lib/admin/table";
import type { AdminProduct, AdminVariant, VariantPrices } from "@/lib/admin/types";
import { parsePriceInput, priceToInput } from "@/lib/pricing";
import { cn } from "@/lib/utils";

type PriceField = "retailPrice";
/** Text typed in the price inputs and not saved yet, by variant id. */
type Drafts = Record<number, Partial<Record<PriceField, string>>>;

const priceFields: { field: PriceField; label: string }[] = [
  { field: "retailPrice", label: "Precio" },
];

export function VariantsGrid({ product }: { product: AdminProduct }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [variants, setVariants] = useState(product.variants);
  const [filter, setFilter] = useState<Record<number, number | undefined>>({});
  const [showInactive, setShowInactive] = useState(false);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [fill, setFill] = useState<Record<PriceField, string>>({ retailPrice: "" });
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<string | undefined>();
  const [dir, setDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  // Solo los atributos que efectivamente varían en este producto.
  const attributes = product.categoryAttributes
    .filter((a) => !a.isAddon)
    .map((a) => ({ ...a, values: a.values.filter((v) => product.allowedValueIds.includes(v.id)) }))
    .filter((a) => a.values.length > 0);
  const labelOf = useMemo(() => new Map(product.categoryAttributes.flatMap((a) => a.values.map((v) => [v.id, v.label] as const))), [product]);
  const filterIds = Object.values(filter).filter((v): v is number => v !== undefined);

  const valueLabel = (v: AdminVariant, attr: (typeof attributes)[number]) =>
    labelOf.get(v.valueIds.find((id) => attr.values.some((x) => x.id === id)) ?? -1) ?? "—";
  const visible = variants.filter(
    (v) => (showInactive || v.isActive) && filterIds.every((id) => v.valueIds.includes(id)),
  );
  const onRequest = visible.filter((v) => v.isActive && v.availability === "aPedido").length;

  // Sorted by saved values: a row must not jump while its price is being typed.
  const sortOrderOf = new Map(attributes.flatMap((a) => a.values.map((x) => [x.id, x.sortOrder] as const)));
  const sortValue = (v: AdminVariant) => {
    if (sort === "sku") return v.sku;
    if (sort === "price") return v.retailPrice;
    if (sort === "status") return !v.isActive ? 2 : v.availability === "disponible" ? 0 : 1;
    const attr = attributes.find((a) => `attr-${a.id}` === sort);
    const valueId = attr && v.valueIds.find((id) => attr.values.some((x) => x.id === id));
    return valueId === undefined ? null : (sortOrderOf.get(valueId) ?? null);
  };
  const searched = visible.filter((v) => matchesSearch(search, [v.sku, ...attributes.map((a) => valueLabel(v, a))]));
  const ordered = sort ? sortRows(searched, sortValue, dir) : searched;
  const { rows: pageRows, page: currentPage, pages } = paginate(ordered, page, pageSize);
  const sortOptions = [
    ...attributes.map((a) => ({ key: `attr-${a.id}`, label: a.name })),
    { key: "sku", label: "SKU" },
    { key: "price", label: "Precio" },
    { key: "status", label: "Estado" },
  ];
  const sortHead = (key: string, label: string, className?: string, align?: "left" | "right") => (
    <SortHead
      key={key}
      label={label}
      active={sort === key}
      dir={dir}
      className={className}
      align={align}
      onSort={() => {
        const next = nextSort(sort, dir, key);
        setSort(next.sort);
        setDir(next.dir);
        setPage(1);
      }}
    />
  );

  const priceText = (v: AdminVariant, field: PriceField) => drafts[v.id]?.[field] ?? priceToInput(v[field]);

  // Rows whose typed prices differ from the stored ones, and how many of the typed values are invalid.
  const changes: VariantPrices[] = [];
  let invalidCount = 0;
  for (const v of variants) {
    if (!drafts[v.id]) continue;
    const retail = parsePriceInput(priceText(v, "retailPrice"));
    if (!retail.ok) {
      invalidCount++;
    } else if (retail.value !== v.retailPrice) {
      changes.push({ variantId: v.id, retailPrice: retail.value });
    }
  }
  const hasDrafts = changes.length > 0 || invalidCount > 0;

  function toggleOne(variant: AdminVariant, availability: Availability) {
    setVariants((vs) => vs.map((v) => (v.id === variant.id ? { ...v, availability } : v)));
    startTransition(async () => {
      const res = await setVariant(variant.id, { availability });
      if (!res.ok) {
        toast.error(res.error);
        setVariants((vs) => vs.map((v) => (v.id === variant.id ? { ...v, availability: variant.availability } : v)));
      }
    });
  }

  function applyBulk(availability: Availability) {
    startTransition(async () => {
      const res = await bulkAvailability(product.id, filterIds, availability);
      if (!res.ok) return void toast.error(res.error);
      setVariants((vs) => vs.map((v) => (v.isActive && filterIds.every((id) => v.valueIds.includes(id)) ? { ...v, availability } : v)));
      toast.success(`${res.data?.updated ?? 0} variantes marcadas como ${availability === "disponible" ? "disponibles" : "a pedido"}`);
      router.refresh();
    });
  }

  function setDraft(variantId: number, field: PriceField, text: string) {
    setDrafts((d) => ({ ...d, [variantId]: { ...d[variantId], [field]: text } }));
  }

  /** Copies the helper prices into every visible row; an empty helper field leaves that column untouched. */
  function fillVisible() {
    const filled = priceFields.filter(({ field }) => fill[field].trim() !== "");
    if (filled.length === 0) return void toast.error("Escribí al menos un precio para aplicar");
    for (const { field } of filled) {
      const parsed = parsePriceInput(fill[field]);
      if (!parsed.ok) return void toast.error(parsed.error);
    }
    setDrafts((d) => {
      const next = { ...d };
      for (const v of visible) {
        next[v.id] = { ...next[v.id], ...Object.fromEntries(filled.map(({ field }) => [field, fill[field].trim()])) };
      }
      return next;
    });
    toast.info(`Precio aplicado a ${visible.length} variantes. Guardá los cambios para confirmarlo.`);
  }

  function savePrices() {
    if (invalidCount > 0) return void toast.error("Revisá los precios marcados en rojo antes de guardar");
    if (changes.length === 0) return;
    startTransition(async () => {
      const res = await saveVariantPrices(product.id, changes);
      if (!res.ok) return void toast.error(res.error);
      const saved = new Map(changes.map((c) => [c.variantId, c]));
      setVariants((vs) =>
        vs.map((v) => {
          const change = saved.get(v.id);
          return change ? { ...v, retailPrice: change.retailPrice } : v;
        }),
      );
      setDrafts({});
      toast.success(`Precios guardados en ${res.data?.updated ?? changes.length} variantes`);
      router.refresh();
    });
  }

  if (variants.length === 0) {
    return <p className="rounded-xl border bg-background p-8 text-center text-sm text-muted-foreground">Este producto no tiene variantes. Habilitá valores en la pestaña Datos.</p>;
  }

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-xl border bg-background p-4" aria-label="Filtros">
        {attributes.map((attr) => (
          <div key={attr.id} className="flex flex-wrap items-center gap-2">
            <span className="w-full shrink-0 text-sm font-medium sm:w-20">{attr.name}</span>
            {[{ id: undefined, label: "Todos" }, ...attr.values].map((v) => {
              const active = filter[attr.id] === v.id;
              return (
                <button
                  key={v.id ?? "all"}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setFilter((f) => ({ ...f, [attr.id]: v.id }));
                    setPage(1);
                  }}
                  className={cn("rounded-full border px-3 py-2 text-sm tabular-nums md:py-1", active ? "border-brand bg-brand text-brand-foreground" : "hover:bg-muted")}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="text-sm text-muted-foreground">
            {visible.length} variantes{onRequest > 0 && ` · ${onRequest} a pedido`}
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="h-11 md:h-7" disabled={pending} onClick={() => applyBulk("disponible")}>
              Marcar {filterIds.length ? "filtradas" : "todas"} disponibles
            </Button>
            <Button size="sm" variant="outline" className="h-11 md:h-7" disabled={pending} onClick={() => applyBulk("aPedido")}>
              Marcar {filterIds.length ? "filtradas" : "todas"} a pedido
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border bg-background p-4" aria-label="Precios">
        <div className="flex flex-wrap items-end gap-3">
          {priceFields.map(({ field, label }) => (
            <div key={field} className="min-w-0 flex-1 space-y-1.5 sm:flex-none">
              <Label htmlFor={`fill-${field}`}>{label} ($)</Label>
              <Input
                id={`fill-${field}`}
                inputMode="numeric"
                placeholder="Sin cambios"
                value={fill[field]}
                aria-invalid={!parsePriceInput(fill[field]).ok}
                onChange={(e) => setFill((f) => ({ ...f, [field]: e.target.value }))}
                className="w-full text-right tabular-nums sm:w-32"
              />
            </div>
          ))}
          <Button size="sm" variant="outline" className="h-11 md:h-7" disabled={pending || visible.length === 0} onClick={fillVisible}>
            Aplicar a las {visible.length} visibles
          </Button>
          <Button size="sm" className="h-11 w-full sm:ml-auto sm:w-auto md:h-7" disabled={pending || !hasDrafts} onClick={savePrices}>
            {changes.length > 0 ? `Guardar precios (${changes.length})` : "Guardar precios"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Precios en pesos, sin centavos. Podés escribir 60000 o 60.000. Un precio vacío se muestra como “Consultar” en el sitio.
          {hasDrafts && <span className="font-medium text-foreground"> Hay cambios sin guardar.</span>}
        </p>
      </section>

      <div className="overflow-hidden rounded-xl border bg-background">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="variants-data"
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-11 w-full items-center gap-2 px-4 py-2 text-left text-sm font-medium hover:bg-muted/50"
        >
          <ChevronRightIcon className={cn("size-4 transition-transform", open && "rotate-90")} aria-hidden />
          Datos de variantes
          <span className="ml-auto font-normal text-muted-foreground tabular-nums">{ordered.length}</span>
        </button>
      </div>

      {open && (
      <div id="variants-data" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox
          value={search}
          placeholder="Buscar SKU o valor"
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
        <div className="flex items-center gap-2">
          <Switch
            id="inactive"
            checked={showInactive}
            onCheckedChange={(on) => {
              setShowInactive(on);
              setPage(1);
            }}
          />
          <Label htmlFor="inactive" className="font-normal text-muted-foreground">Mostrar desactivadas</Label>
        </div>
        <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
          {/* The table headers sort on larger screens; the cards have no headers. */}
          <div className="min-w-0 flex-1 sm:hidden">
            <Select
              value={sort ? `${sort}:${dir}` : "default"}
              onValueChange={(value) => {
                const [key, direction] = value.split(":");
                setSort(value === "default" ? undefined : key);
                setDir(direction === "desc" ? "desc" : "asc");
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="Ordenar variantes" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Orden original</SelectItem>
                {sortOptions.flatMap((o) => [
                  <SelectItem key={`${o.key}:asc`} value={`${o.key}:asc`}>{o.label} ↑</SelectItem>,
                  <SelectItem key={`${o.key}:desc`} value={`${o.key}:desc`}>{o.label} ↓</SelectItem>,
                ])}
              </SelectContent>
            </Select>
          </div>
          <PageSizeSelect
            value={pageSize}
            onChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </div>
      </div>

      {ordered.length === 0 && <p className="rounded-xl border bg-background p-8 text-center text-sm text-muted-foreground">No hay variantes con estos filtros.</p>}

      {/* Below sm: one card per variant, bound to the same state as the table. */}
      <ul className="space-y-2 sm:hidden" aria-label="Variantes">
        {pageRows.map((v) => (
          <li key={v.id} className={cn("space-y-3 rounded-xl border bg-background p-3", !v.isActive && "opacity-50")}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium tabular-nums">{attributes.map((a) => valueLabel(v, a)).join(" · ") || v.sku}</p>
              {v.isActive ? <AvailabilityBadge availability={v.availability} /> : <span className="text-xs">Desactivada</span>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {priceFields.map(({ field, label }) => {
                const text = priceText(v, field);
                const id = `variant-card-${v.id}-${field}`;
                return (
                  <div key={field} className="min-w-0 space-y-1.5">
                    <Label htmlFor={id} className="text-xs text-muted-foreground">{label} ($)</Label>
                    <Input
                      id={id}
                      inputMode="numeric"
                      placeholder="—"
                      aria-invalid={!parsePriceInput(text).ok}
                      value={text}
                      onChange={(e) => setDraft(v.id, field, e.target.value)}
                      className="w-full text-right tabular-nums"
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`variant-card-${v.id}-available`} className="font-normal">Disponible</Label>
              <Switch
                id={`variant-card-${v.id}-available`}
                checked={v.availability === "disponible"}
                disabled={!v.isActive}
                onCheckedChange={(on) => toggleOne(v, on ? "disponible" : "aPedido")}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className={cn("hidden overflow-x-auto rounded-xl border bg-background", ordered.length > 0 && "sm:block")}>
        <Table>
          <TableHeader>
            <TableRow>
              {attributes.map((a) => sortHead(`attr-${a.id}`, a.name))}
              {sortHead("sku", "SKU", "hidden md:table-cell")}
              {priceFields.map(({ label }) => sortHead("price", label, undefined, "right"))}
              {sortHead("status", "Estado")}
              <TableHead className="text-right">Disponible</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((v) => (
              <TableRow key={v.id} className={cn(!v.isActive && "opacity-50")}>
                {attributes.map((a) => (
                  <TableCell key={a.id} className="tabular-nums">
                    {valueLabel(v, a)}
                  </TableCell>
                ))}
                <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">{v.sku}</TableCell>
                {priceFields.map(({ field, label }) => {
                  const text = priceText(v, field);
                  return (
                    <TableCell key={field} className="text-right">
                      <Input
                        inputMode="numeric"
                        placeholder="—"
                        aria-label={`Precio ${label.toLowerCase()}: ${v.sku}`}
                        aria-invalid={!parsePriceInput(text).ok}
                        value={text}
                        onChange={(e) => setDraft(v.id, field, e.target.value)}
                        className="ml-auto w-28 text-right tabular-nums"
                      />
                    </TableCell>
                  );
                })}
                <TableCell>{v.isActive ? <AvailabilityBadge availability={v.availability} /> : <span className="text-xs">Desactivada</span>}</TableCell>
                <TableCell className="text-right">
                  <Switch
                    aria-label={`Disponible: ${v.sku}`}
                    checked={v.availability === "disponible"}
                    disabled={!v.isActive}
                    onCheckedChange={(on) => toggleOne(v, on ? "disponible" : "aPedido")}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <TablePager page={currentPage} pages={pages} pageSize={pageSize} total={ordered.length} noun="variantes" onPage={setPage} />
      </div>
      )}
    </div>
  );
}
