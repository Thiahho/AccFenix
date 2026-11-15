import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/** Origin of the public API, which client components call from the browser (e.g. live variant status). */
function apiOrigin(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5080").origin;
  } catch {
    return null;
  }
}

/*
 * `upgrade-insecure-requests` rewrites every http:// subresource and fetch to https://. That is only safe when the API
 * is served over https (or NEXT_PUBLIC_API_URL is unset, meaning same-origin); with an http API (e.g. a production
 * build run locally against http://localhost:5080) the upgraded calls would fail. HSTS is unaffected by this check.
 */
function apiIsHttpsOrSameOrigin(): boolean {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return true;
  try {
    return new URL(raw).protocol === "https:";
  } catch {
    return false;
  }
}

const upgradeInsecure = !isDev && apiIsHttpsOrSameOrigin();

/*
 * Static Content-Security-Policy. It keeps every page statically cacheable, so scripts allow 'unsafe-inline' (Next's
 * inline bootstrap and the intro gate script); a nonce-based policy would block injected inline scripts too but forces
 * dynamic rendering on every request. What this policy does enforce: scripts, styles and fonts only from this origin,
 * network calls only to this origin, the API and Cloudinary uploads, images only from here and Cloudinary, no plugins,
 * no framing, no foreign <base> and forms posting only here. Dev adds what React Refresh and HMR need.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "media-src 'self' https://res.cloudinary.com",
  "font-src 'self' data:",
  ["connect-src 'self'", apiOrigin(), "https://api.cloudinary.com", isDev ? "ws: wss:" : null].filter(Boolean).join(" "),
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(upgradeInsecure ? ["upgrade-insecure-requests"] : []),
].join("; ");

// Security headers for every route.
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=()" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
