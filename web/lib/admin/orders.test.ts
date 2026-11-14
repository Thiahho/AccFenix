import { describe, expect, it } from "vitest";
import { formatOrderDate, locationFieldErrors, mapsLinkPoint, orderTotalLabel, ordersListPath, ordersPageHref, pageCount, parseOrdersQuery, whatsappChatHref } from "@/lib/admin/orders";

describe("parseOrdersQuery", () => {
  it("defaults to the first page and every status", () => {
    expect(parseOrdersQuery({})).toEqual({ page: 1, status: undefined });
  });

  it("keeps a valid page and status", () => {
    expect(parseOrdersQuery({ pagina: "3", estado: "delivered" })).toEqual({ page: 3, status: "delivered" });
  });

  it("ignores invalid values", () => {
    expect(parseOrdersQuery({ pagina: "-2", estado: "shipped" })).toEqual({ page: 1, status: undefined });
    expect(parseOrdersQuery({ pagina: "abc" })).toEqual({ page: 1, status: undefined });
  });
});

describe("ordersListPath", () => {
  it("builds the API path with page size and optional status", () => {
    expect(ordersListPath({ page: 2 })).toBe("/api/admin/orders?page=2&pageSize=20");
    expect(ordersListPath({ page: 1, status: "pending" })).toBe("/api/admin/orders?page=1&pageSize=20&status=pending");
  });
});

describe("ordersPageHref", () => {
  it("omits defaults from the admin URL", () => {
    expect(ordersPageHref({ page: 1 })).toBe("/admin/pedidos");
    expect(ordersPageHref({ page: 2, status: "confirmed" })).toBe("/admin/pedidos?estado=confirmed&pagina=2");
    expect(ordersPageHref({ page: 1, status: "cancelled" })).toBe("/admin/pedidos?estado=cancelled");
  });
});

describe("pageCount", () => {
  it("rounds up and is at least one", () => {
    expect(pageCount(0, 20)).toBe(1);
    expect(pageCount(20, 20)).toBe(1);
    expect(pageCount(21, 20)).toBe(2);
  });
});

describe("orderTotalLabel", () => {
  it("shows the total in ARS", () => {
    expect(orderTotalLabel({ total: 1500, hasUnpricedItems: false })).toBe("$ 1.500");
  });

  it("shows Consultar when nothing is priced", () => {
    expect(orderTotalLabel({ total: 0, hasUnpricedItems: true })).toBe("Consultar");
  });

  it("marks partial totals", () => {
    expect(orderTotalLabel({ total: 1500, hasUnpricedItems: true })).toBe("$ 1.500 + a consultar");
  });
});

describe("formatOrderDate", () => {
  it("shows the date and time in Buenos Aires", () => {
    expect(formatOrderDate("2026-11-13T15:05:00Z")).toBe("13/11/2026 12:05");
  });
});

describe("whatsappChatHref", () => {
  it("opens a chat with an Argentine number written in any local format", () => {
    expect(whatsappChatHref("11 5555-0000")).toBe("https://wa.me/5491155550000");
    expect(whatsappChatHref("011 5555-0000")).toBe("https://wa.me/5491155550000");
    expect(whatsappChatHref("+54 9 351 555-0000")).toBe("https://wa.me/5493515550000");
    expect(whatsappChatHref("0054 9 11 5555 0000")).toBe("https://wa.me/5491155550000");
  });

  it("gives no link when there is no usable number", () => {
    expect(whatsappChatHref(null)).toBeNull();
    expect(whatsappChatHref("")).toBeNull();
    expect(whatsappChatHref("1234")).toBeNull();
  });
});

describe("mapsLinkPoint", () => {
  it("reads the point of a full Google Maps link without the network", () => {
    expect(mapsLinkPoint("https://www.google.com/maps/place/X/@-34.6,-58.4,17z/data=!3d-34.651!4d-58.644")).toEqual({
      coords: { lat: -34.651, lng: -58.644 },
    });
  });

  it("asks to resolve short links on the server", () => {
    expect(mapsLinkPoint(" https://maps.app.goo.gl/abc123 ")).toEqual({ resolve: true });
  });

  it("rejects links that are not from Google Maps", () => {
    expect(mapsLinkPoint("https://example.com/@-34.6,-58.4")).toEqual({ error: "link-invalido" });
    expect(mapsLinkPoint("Rivadavia 1234")).toEqual({ error: "link-invalido" });
  });

  it("reports a Maps link without coordinates", () => {
    expect(mapsLinkPoint("https://www.google.com/maps/search/ferreteria")).toEqual({ error: "sin-coordenadas" });
  });
});

describe("locationFieldErrors", () => {
  it("maps API validation keys to the form fields", () => {
    expect(
      locationFieldErrors({ Locality: ["Requerida"], Address: ["Hasta 200 caracteres"], Longitude: ["La ubicación necesita latitud y longitud"] }),
    ).toEqual({ locality: "Requerida", address: "Hasta 200 caracteres", point: "La ubicación necesita latitud y longitud" });
  });

  it("returns nothing without field errors", () => {
    expect(locationFieldErrors(undefined)).toEqual({});
    expect(locationFieldErrors({ Other: ["x"] })).toEqual({});
  });
});
