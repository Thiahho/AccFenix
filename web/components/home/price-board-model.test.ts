import { describe, expect, it } from "vitest";
import type { ProductDetail } from "@/lib/api";
import { buildCategoryBoard, groupByCategory, MAX_COLUMNS, shortLabel } from "./price-board-model";

type Product = Pick<ProductDetail, "attributes" | "variants" | "category">;

/** A product whose variants each carry one value of a single "Tamaño" attribute, labelled as given. */
function product(labels: string[], firstVariantId = 1, category = { slug: "cafes", name: "Cafés" }): Product {
  const values = [...new Set(labels)].map((label, i) => ({ id: firstVariantId * 100 + i, label }));
  return {
    category,
    attributes: [{ id: 1, name: "Tamaño", values }],
    variants: labels.map((label, i) => ({
      id: firstVariantId + i,
      sku: `SKU-${firstVariantId + i}`,
      valueIds: [values.find((v) => v.label === label)!.id],
      availability: "disponible",
      retailPrice: 1000 + i,
    })),
  } as unknown as Product;
}

const columnVariantIds = (board: ReturnType<typeof buildCategoryBoard<Product>>) =>
  board.lines.flatMap((l) => l.columnCells.flatMap((c) => (c ? [c.row.variantId] : [])));
const listVariantIds = (board: ReturnType<typeof buildCategoryBoard<Product>>) =>
  board.lines.flatMap((l) => l.cells.map((c) => c.row.variantId));
const reachableIds = (board: ReturnType<typeof buildCategoryBoard<Product>>) =>
  (board.asColumns ? columnVariantIds(board) : listVariantIds(board)).sort((a, b) => a - b);

describe("groupByCategory", () => {
  it("groups by slug, keeping first-seen category and product order", () => {
    const a = product(["Chico"], 1, { slug: "cafes", name: "Cafés" });
    const b = product(["Chico"], 2, { slug: "extras", name: "Extras" });
    const c = product(["Grande"], 3, { slug: "cafes", name: "Cafés" });

    const groups = groupByCategory([a, b, c]);

    expect(groups.map((g) => g.slug)).toEqual(["cafes", "extras"]);
    expect(groups[0].products).toEqual([a, c]);
    expect(groups[1].products).toEqual([b]);
  });
});

describe("shortLabel", () => {
  it("removes only the final parenthetical", () => {
    expect(shortLabel("Chico (500 cc)")).toBe("Chico");
    expect(shortLabel("Vaso (doble) grande (500 cc)")).toBe("Vaso (doble) grande");
  });

  it("keeps labels without a final parenthetical, or that are only one", () => {
    expect(shortLabel("Chico (doble) frío")).toBe("Chico (doble) frío");
    expect(shortLabel("(500 cc)")).toBe("(500 cc)");
  });
});

describe("buildCategoryBoard", () => {
  it("leaves a gap for a size a product does not have", () => {
    const board = buildCategoryBoard([product(["Chico", "Grande"], 1), product(["Grande"], 10)]);

    expect(board.asColumns).toBe(true);
    expect(board.headings.map((h) => h.text)).toEqual(["Chico", "Grande"]);
    expect(board.lines[1].columnCells[0]).toBeNull();
    expect(board.lines[1].columnCells[1]?.row.variantId).toBe(10);
  });

  it("uses columns up to the limit and captions above it", () => {
    const fits = ["A", "B", "C"].slice(0, MAX_COLUMNS);
    expect(buildCategoryBoard([product(fits)]).asColumns).toBe(true);

    const board = buildCategoryBoard([product(["A", "B", "C", "D"])]);
    expect(board.asColumns).toBe(false);
    expect(reachableIds(board)).toEqual([1, 2, 3, 4]);
  });

  it("keeps every variant reachable when a product repeats a label", () => {
    const board = buildCategoryBoard([product(["Chico", "Chico", "Grande"], 1), product(["Chico"], 10)]);

    expect(reachableIds(board)).toEqual([1, 2, 3, 10]);
  });

  it("gives repeated labels distinct captions and accessible labels", () => {
    const board = buildCategoryBoard([product(["Chico", "Chico"], 1)]);
    const cells = board.lines[0].cells;

    expect(new Set(cells.map((c) => c.caption)).size).toBe(2);
    expect(new Set(cells.map((c) => c.label)).size).toBe(2);
  });

  it("keeps the full label when short labels collide", () => {
    const board = buildCategoryBoard([product(["Chico (350 cc)", "Chico (500 cc)", "Grande (1 l)"])]);

    expect(board.headings.map((h) => h.text)).toEqual(["Chico (350 cc)", "Chico (500 cc)", "Grande"]);
    expect(reachableIds(board)).toEqual([1, 2, 3]);
  });

  it("keeps full captions on collisions when there are too many sizes for columns", () => {
    const board = buildCategoryBoard([product(["Chico (350 cc)", "Chico (500 cc)", "Medio (700 cc)", "Grande (1 l)"])]);

    expect(board.lines[0].cells.map((c) => c.caption)).toEqual(["Chico (350 cc)", "Chico (500 cc)", "Medio", "Grande"]);
  });
});
