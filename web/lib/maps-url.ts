import type { Coords } from "@/lib/geo";

const NUM = String.raw`(-?\d{1,3}(?:\.\d+)?)`;
const PIN = new RegExp(`!3d${NUM}!4d${NUM}`);
const AT = new RegExp(`@${NUM},${NUM}`);
const PATH = new RegExp(`/(?:place|search|dir)/${NUM},\\+?${NUM}`);
const PAIR = new RegExp(`^\\s*${NUM}\\s*,\\s*${NUM}\\s*$`);
const COORD_PARAMS = ["q", "query", "ll", "destination", "daddr", "center", "viewpoint"];

const SHORT_HOSTS = ["maps.app.goo.gl", "goo.gl"];
const GOOGLE_HOST = /(^|\.)google\.(com|com\.ar)$/;

function toUrl(text: string): URL | null {
  try {
    const url = new URL(text.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

/** Host de Google al que se le puede seguir una redirección (links cortos incluidos). */
export function isGoogleHost(hostname: string) {
  return SHORT_HOSTS.includes(hostname) || GOOGLE_HOST.test(hostname);
}

export function isShortMapsUrl(text: string) {
  const url = toUrl(text);
  return !!url && SHORT_HOSTS.includes(url.hostname) && (url.hostname !== "goo.gl" || url.pathname.startsWith("/maps"));
}

export function isMapsUrl(text: string) {
  const url = toUrl(text);
  if (!url) return false;
  if (isShortMapsUrl(text)) return true;
  return GOOGLE_HOST.test(url.hostname) && (url.hostname.startsWith("maps.") || url.pathname.startsWith("/maps"));
}

function coords(lat: string, lng: string): Coords | null {
  const c = { lat: Number(lat), lng: Number(lng) };
  const valid = Number.isFinite(c.lat) && Number.isFinite(c.lng) && Math.abs(c.lat) <= 90 && Math.abs(c.lng) <= 180 && !(c.lat === 0 && c.lng === 0);
  return valid ? c : null;
}

/**
 * Coordenadas de un link de Google Maps. Prioriza el pin del lugar (!3d…!4d…) sobre el centro
 * de la vista (@lat,lng), que también es el que traen los links de Street View.
 */
export function parseMapsUrl(text: string): Coords | null {
  const url = toUrl(text);
  if (!url || !isMapsUrl(text)) return null;

  let path = url.pathname;
  try {
    path = decodeURIComponent(url.pathname);
  } catch {
    // Path con % sueltos: se usa tal cual.
  }

  const pin = url.href.match(PIN) ?? path.match(AT);
  if (pin) return coords(pin[1], pin[2]);

  for (const name of COORD_PARAMS) {
    const pair = url.searchParams.get(name)?.match(PAIR);
    if (pair) return coords(pair[1], pair[2]);
  }

  const inPath = path.match(PATH);
  return inPath ? coords(inPath[1], inPath[2]) : null;
}

export function mapsLink({ lat, lng }: Coords) {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}
