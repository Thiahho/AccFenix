import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => cookieStore,
  headers: async () => new Headers({ "x-real-ip": "203.0.113.7" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

const { AdminApiError, SESSION_COOKIE, adminFetch, clearSession, login, setSession } = await import("./session");

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubEnv("API_URL", "http://api.test");
  vi.stubEnv("API_TRUSTED_KEY", "secret");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  cookieStore.get.mockReset();
  cookieStore.set.mockReset();
  cookieStore.delete.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("session cookie", () => {
  it("stores the token in an httpOnly cookie that expires with the JWT", async () => {
    await setSession("jwt", "2026-11-15T16:00:00Z");
    expect(cookieStore.set).toHaveBeenCalledWith(SESSION_COOKIE, "jwt", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      expires: new Date("2026-11-15T16:00:00Z"),
    });
  });

  it("marks the cookie secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await setSession("jwt", "2026-11-15T16:00:00Z");
    expect(cookieStore.set.mock.calls[0][2]).toMatchObject({ secure: true });
  });

  it("deletes the cookie on logout", async () => {
    await clearSession();
    expect(cookieStore.delete).toHaveBeenCalledWith(SESSION_COOKIE);
  });
});

describe("login", () => {
  it("sends the visitor IP headers and stores the session on success", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { token: "jwt", expiresAt: "2026-11-15T16:00:00Z" }));

    expect(await login("admin@test", "pw")).toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api.test/api/auth/login");
    expect(init.headers).toMatchObject({ "X-Client-Ip": "203.0.113.7", "X-Trusted-Web-Key": "secret" });
    expect(cookieStore.set).toHaveBeenCalledWith(SESSION_COOKIE, "jwt", expect.objectContaining({ expires: new Date("2026-11-15T16:00:00Z") }));
  });

  it("explains the rate limit", async () => {
    fetchMock.mockResolvedValue(jsonResponse(429, {}));
    expect(await login("a", "b")).toEqual({ ok: false, error: "Demasiados intentos. Esperá unos minutos." });
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("shows the API problem detail", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { detail: "Credenciales inválidas" }));
    expect(await login("a", "b")).toEqual({ ok: false, error: "Credenciales inválidas" });
  });

  it("falls back to the status when the body is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("oops", { status: 500 }));
    expect(await login("a", "b")).toEqual({ ok: false, error: "Error 500" });
  });
});

describe("adminFetch", () => {
  it("redirects to the login without a session cookie", async () => {
    cookieStore.get.mockReturnValue(undefined);
    await expect(adminFetch("/api/admin/x")).rejects.toThrow("REDIRECT /admin/login");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the bearer token and returns the JSON body", async () => {
    cookieStore.get.mockReturnValue({ value: "jwt" });
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 1 }));

    expect(await adminFetch("/api/admin/x")).toEqual({ id: 1 });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({ Authorization: "Bearer jwt" });
  });

  it("redirects to the login when the token expired", async () => {
    cookieStore.get.mockReturnValue({ value: "jwt" });
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    await expect(adminFetch("/api/admin/x")).rejects.toThrow("REDIRECT /admin/login?expirada=1");
  });

  it("throws an AdminApiError with the first field error", async () => {
    cookieStore.get.mockReturnValue({ value: "jwt" });
    fetchMock.mockResolvedValue(jsonResponse(400, { title: "Bad", errors: { Name: ["Nombre requerido"] } }));
    const error = await adminFetch("/api/admin/x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AdminApiError);
    expect(error).toMatchObject({ status: 400, message: "Nombre requerido" });
  });

  it("returns undefined for 204", async () => {
    cookieStore.get.mockReturnValue({ value: "jwt" });
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    expect(await adminFetch("/api/admin/x")).toBeUndefined();
  });
});
