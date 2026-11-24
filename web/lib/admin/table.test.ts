import { describe, expect, it } from "vitest";
import { matchesSearch, nextSort, paginate, parseTableParams, sortRows } from "@/lib/admin/table";

describe("parseTableParams", () => {
  it("uses defaults for missing or invalid values", () => {
    expect(parseTableParams({ orden: "x", dir: "y", pagina: "-1", por: "7" }, ["name"])).toEqual({
      search: "",
      sort: undefined,
      dir: "asc",
      page: 1,
      pageSize: 20,
    });
  });

  it("keeps valid values and takes the first of repeated params", () => {
    expect(parseTableParams({ q: " café ", orden: ["name", "x"], dir: "desc", pagina: "3", por: "50" }, ["name"])).toEqual({
      search: "café",
      sort: "name",
      dir: "desc",
      page: 3,
      pageSize: 50,
    });
  });
});

describe("matchesSearch", () => {
  it("ignores case and accents and needs every word", () => {
    expect(matchesSearch("cafe LATTE", ["Café", "latte frío"])).toBe(true);
    expect(matchesSearch("cafe mocha", ["Café", "latte"])).toBe(false);
    expect(matchesSearch("  ", [null])).toBe(true);
  });
});

describe("sortRows", () => {
  it("sorts numbers inside text naturally", () => {
    expect(sortRows(["10 u", "2 u"], (x) => x, "asc")).toEqual(["2 u", "10 u"]);
  });

  it("leaves empty values last in both directions", () => {
    const rows = [{ v: 1 }, { v: null }, { v: 3 }];
    expect(sortRows(rows, (r) => r.v, "asc").map((r) => r.v)).toEqual([1, 3, null]);
    expect(sortRows(rows, (r) => r.v, "desc").map((r) => r.v)).toEqual([3, 1, null]);
  });
});

describe("paginate", () => {
  it("cuts the requested page", () => {
    expect(paginate([1, 2, 3, 4, 5], 2, 2)).toEqual({ rows: [3, 4], page: 2, pages: 3, total: 5 });
  });

  it("moves a page past the end to the last one", () => {
    expect(paginate([1, 2, 3], 9, 2)).toEqual({ rows: [3], page: 2, pages: 2, total: 3 });
    expect(paginate([], 4, 10)).toEqual({ rows: [], page: 1, pages: 1, total: 0 });
  });
});

describe("nextSort", () => {
  it("cycles ascending, descending and default", () => {
    expect(nextSort<string>(undefined, "asc", "name")).toEqual({ sort: "name", dir: "asc" });
    expect(nextSort<string>("name", "asc", "name")).toEqual({ sort: "name", dir: "desc" });
    expect(nextSort<string>("name", "desc", "name")).toEqual({ sort: undefined, dir: "asc" });
    expect(nextSort<string>("name", "desc", "total")).toEqual({ sort: "total", dir: "asc" });
  });
});
