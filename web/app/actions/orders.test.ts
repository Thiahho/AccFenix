import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderForm } from "@/lib/order";

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-real-ip": "203.0.113.7" }),
}));

const { submitOrder } = await import("./orders");

const form: OrderForm = { cliente: "personal", zona: "buenos-aires", nombre: "Ana", localidad: "Quilmes", direccion: "Calle 123" };
const lines = [{ variantId: 7, qty: 2 }];

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubEnv("API_URL", "http://api.test");
  vi.stubEnv("API_TRUSTED_KEY", "secret");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("submitOrder", () => {
  it("rejects invalid data without calling the API", async () => {
    const result = await submitOrder(form, []);
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid form without calling the API", async () => {
    const result = await submitOrder({ ...form, nombre: "" }, lines);
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the order with the visitor IP headers and returns the created order", async () => {
    const order = { id: 42, code: "A-42" };
    fetchMock.mockResolvedValue(jsonResponse(201, order));

    const result = await submitOrder(form, lines);

    expect(result).toEqual({ ok: true, order });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api.test/api/orders");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "X-Client-Ip": "203.0.113.7", "X-Trusted-Web-Key": "secret" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(init.body as string).items).toEqual([{ variantId: 7, quantity: 2 }]);
  });

  it("maps API validation errors to the form fields", async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { errors: { CustomerName: ["Ingresá tu nombre"] } }));
    const result = await submitOrder(form, lines);
    expect(result).toMatchObject({ ok: false, reason: "invalid", fieldErrors: { nombre: "Ingresá tu nombre" } });
  });

  it("reports the API rate limit", async () => {
    fetchMock.mockResolvedValue(jsonResponse(429, null));
    expect(await submitOrder(form, lines)).toMatchObject({ ok: false, reason: "rateLimited" });
  });

  it("treats a server error as unavailable", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));
    expect(await submitOrder(form, lines)).toMatchObject({ ok: false, reason: "unavailable" });
  });

  it("treats a timeout as unavailable", async () => {
    fetchMock.mockRejectedValue(new DOMException("The operation timed out.", "TimeoutError"));
    expect(await submitOrder(form, lines)).toMatchObject({ ok: false, reason: "unavailable" });
    expect(console.error).toHaveBeenCalled();
  });
});
