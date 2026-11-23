import type { ProductDetail } from "@/lib/api";
import { priceRows, type PriceRow } from "@/lib/catalog";

type BoardProduct = Pick<ProductDetail, "attributes" | "variants" | "category">;

/** More sizes than this no longer fit as columns on a phone, so each price carries its own caption. */
export const MAX_COLUMNS = 3;

export type CategoryGroup<P> = { slug: string; name: string; products: P[] };
/** One purchasable price. `label` names it for assistive technology, `caption` is the visible size. */
export type BoardCell = { row: PriceRow; label: string; caption: string };
/** `cells` holds every variant; `columnCells` aligns them to the headings, with null for a missing size. */
export type BoardLine<P> = { product: P; cells: BoardCell[]; columnCells: (BoardCell | null)[] };
export type CategoryBoard<P> = { asColumns: boolean; headings: { key: string; text: string }[]; lines: BoardLine<P>[] };

export function groupByCategory<P extends Pick<BoardProduct, "category">>(products: P[]): CategoryGroup<P>[] {
  const groups = new Map<string, CategoryGroup<P>>();
  for (const product of products) {
    const { slug, name } = product.category;
    const group = groups.get(slug) ?? { slug, name, products: [] };
    group.products.push(product);
    groups.set(slug, group);
  }
  return [...groups.values()];
}

/** "Vaso (doble) (500 cc)" → "Vaso (doble)". A label that is only a parenthetical stays whole. */
export function shortLabel(label: string): string {
  return label.replace(/\s*\([^()]*\)\s*$/, "") || label;
}

/** Short form of each label, except labels whose short form another label shares: those stay in full. */
function displayLabels(labels: string[]): Map<string, string> {
  const uses = new Map<string, number>();
  for (const label of labels) uses.set(shortLabel(label), (uses.get(shortLabel(label)) ?? 0) + 1);
  return new Map(labels.map((label) => [label, uses.get(shortLabel(label)) === 1 ? shortLabel(label) : label]));
}

/** Builds one category card. A product repeating a label cannot share a column, so that card uses captions. */
export function buildCategoryBoard<P extends Pick<BoardProduct, "attributes" | "variants">>(products: P[]): CategoryBoard<P> {
  const rowsByProduct = products.map((product) => ({ product, rows: priceRows(product) }));
  const columns = [...new Set(rowsByProduct.flatMap((l) => l.rows.map((r) => r.label)))];
  const display = displayLabels(columns);
  const repeatsLabel = rowsByProduct.some(({ rows }) => new Set(rows.map((r) => r.label)).size < rows.length);

  const lines = rowsByProduct.map(({ product, rows }) => {
    const seen = new Map<string, number>();
    const cells = rows.map((row): BoardCell => {
      const nth = (seen.get(row.label) ?? 0) + 1;
      seen.set(row.label, nth);
      const suffix = nth > 1 ? ` · ${nth}` : "";
      return { row, label: `${row.label}${suffix}`, caption: `${display.get(row.label)}${suffix}` };
    });
    return { product, cells, columnCells: columns.map((c) => cells.find((cell) => cell.row.label === c) ?? null) };
  });

  return {
    asColumns: columns.length <= MAX_COLUMNS && !repeatsLabel,
    headings: columns.map((c) => ({ key: c, text: display.get(c) ?? c })),
    lines,
  };
}
