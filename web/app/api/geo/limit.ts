import { NextResponse } from "next/server";
import { clientIp } from "@/lib/admin/client-ip";
import { createRateLimiter } from "@/lib/rate-limit";

// Generous limits: the searches are debounced on the client, so a person typing never gets near them.
const limiters = {
  localidades: createRateLimiter({ limit: 30, windowMs: 60_000 }),
  direcciones: createRateLimiter({ limit: 30, windowMs: 60_000 }),
  ubicacion: createRateLimiter({ limit: 10, windowMs: 60_000 }),
};

/**
 * Per-IP guard for the geocoding proxies (they spend third-party quota). Returns a 429 response when the
 * visitor went over the limit, or null to continue. Without a proxy IP header (local dev) it does not limit.
 * The body keeps each route's shape (search routes always carry `items`) and reuses the "sin-servicio" code
 * the client already explains to the visitor.
 */
export function geoRateLimit(route: keyof typeof limiters, headers: Headers): NextResponse | null {
  const ip = clientIp(headers);
  if (!ip) return null;
  const result = limiters[route].check(ip);
  if (result.ok) return null;
  const body = route === "ubicacion" ? { error: "sin-servicio" } : { items: [], error: "sin-servicio" };
  return NextResponse.json(body, { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } });
}
