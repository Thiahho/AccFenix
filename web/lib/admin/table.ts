export const PAGE_SIZES = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_SEARCH_LENGTH = 100;

export type SortDir = "asc" | "desc";
export type UrlParams = Record<string, string | string[] | undefined>;
export type TableState<S extends string> = { search: string; sort?: S; dir: SortDir; page: number; pageSize: number };

/** A repeated query param arrives as an array: the first value wins. */
export const firstParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function parsePage(value: string | string[] | undefined) {
  const page = Number(firstParam(value));
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

export function parsePageSize(value: string | string[] | undefined) {
  const size = Number(firstParam(value));
  return (PAGE_SIZES as readonly number[]).includes(size) ? size : DEFAULT_PAGE_SIZE;
}

/** Reads the shared table params (`q`, `orden`, `dir`, `pagina`, `por`), ignoring values that make no sense. */
export function parseTableParams<S extends string>(params: UrlParams, sortKeys: readonly S[]): TableState<S> {
  const rawSort = firstParam(params.orden);
  const sort = sortKeys.find((key) => key === rawSort);
  return {
    search: (firstParam(params.q) ?? "").trim().slice(0, MAX_SEARCH_LENGTH),
    sort,
    dir: firstParam(params.dir) === "desc" ? "desc" : "asc",
    page: parsePage(params.pagina),
    pageSize: parsePageSize(params.por),
  };
}

/** Lowercase and without accents, so "cafe" finds "Café". */
export const normalizeText = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** True when every word of the search appears in some field. */
export function matchesSearch(search: string, fields: (string | null | undefined)[]) {
  const words = normalizeText(search).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeText(fields.filter(Boolean).join(" "));
  return words.every((word) => haystack.includes(word));
}

const collator = new Intl.Collator("es", { numeric: true, sensitivity: "base" });

/** Stable sort that leaves empty values last in both directions. */
export function sortRows<T>(rows: readonly T[], value: (row: T) => string | number | null | undefined, dir: SortDir) {
  const factor = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = value(a);
    const y = value(b);
    if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;
    return factor * (typeof x === "number" && typeof y === "number" ? x - y : collator.compare(String(x), String(y)));
  });
}

/** Cuts one page, moving a page past the end back to the last one. */
export function paginate<T>(rows: readonly T[], page: number, pageSize: number) {
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(Math.max(1, page), pages);
  const start = (current - 1) * pageSize;
  return { rows: rows.slice(start, start + pageSize), page: current, pages, total: rows.length };
}

/** Header click cycle: ascending, descending, back to the default order. */
export function nextSort<S extends string>(current: S | undefined, dir: SortDir, key: S): { sort?: S; dir: SortDir } {
  if (current !== key) return { sort: key, dir: "asc" };
  return dir === "asc" ? { sort: key, dir: "desc" } : { sort: undefined, dir: "asc" };
}
