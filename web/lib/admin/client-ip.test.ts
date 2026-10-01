import { describe, expect, it } from "vitest";
import { clientIp, clientIpHeaders } from "@/lib/admin/client-ip";

describe("clientIp", () => {
  it("prefers x-real-ip and falls back to the first x-forwarded-for entry", () => {
    expect(clientIp(new Headers({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1" }))).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" }))).toBe("198.51.100.1");
  });

  it("returns null when the proxy sent nothing", () => {
    expect(clientIp(new Headers())).toBeNull();
    expect(clientIp(new Headers({ "x-forwarded-for": " " }))).toBeNull();
  });
});

describe("clientIpHeaders", () => {
  it("sends the visitor IP together with the shared key", () => {
    expect(clientIpHeaders(new Headers({ "x-real-ip": "203.0.113.7" }), "clave")).toEqual({
      "X-Client-Ip": "203.0.113.7",
      "X-Trusted-Web-Key": "clave",
    });
  });

  it("sends nothing without a key or without an IP", () => {
    expect(clientIpHeaders(new Headers({ "x-real-ip": "203.0.113.7" }), undefined)).toEqual({});
    expect(clientIpHeaders(new Headers(), "clave")).toEqual({});
  });
});
