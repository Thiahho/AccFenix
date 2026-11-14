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

/** Delivery location of an order, as the admin API returns it. */
export type OrderPlace = {
  address: string | null;
  locality: string | null;
  latitude: number | null;
  longitude: number | null;
};

const MAX_URL_LENGTH = 2048;
/** 9 waypoints + destination: the most a Google Maps directions link takes. */
const MAX_STOPS_PER_LEG = 10;

function placeCoords({ latitude, longitude }: OrderPlace): Coords | null {
  return latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null;
}

function placeText({ address, locality }: OrderPlace) {
  const text = [address, locality].map((part) => part?.trim()).filter(Boolean).join(", ");
  return text || null;
}

/** A route stop: "lat,lng" when the order has coordinates, otherwise "address, locality". */
export function routeStop(place: OrderPlace): string | null {
  const c = placeCoords(place);
  return c ? `${c.lat.toFixed(6)},${c.lng.toFixed(6)}` : placeText(place);
}

/** Link to the order's place: the pin when there are coordinates, otherwise an address search. */
export function mapsPlaceLink(place: OrderPlace): string | null {
  const c = placeCoords(place);
  if (c) return mapsLink(c);
  const text = placeText(place);
  return text ? `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query: text })}` : null;
}

export type RouteLeg = { url: string; /** 1-based number of the leg's first new stop. */ from: number; /** 1-based number of its last stop. */ to: number };

function directionsUrl(origin: string | undefined, stops: string[]) {
  const params = new URLSearchParams({ api: "1", travelmode: "driving" });
  if (origin) params.set("origin", origin);
  params.set("destination", stops[stops.length - 1]);
  if (stops.length > 1) params.set("waypoints", stops.slice(0, -1).join("|"));
  return `https://www.google.com/maps/dir/?${params}`;
}

/**
 * Directions links that visit the stops exactly in the given order (no optimization). The first
 * leg starts at the device's location; when the stops do not fit in one link (10 stops or 2048
 * characters), each later leg starts at the previous leg's last stop.
 */
export function mapsRouteLegs(stops: string[]): RouteLeg[] {
  const legs: RouteLeg[] = [];
  let next = 0;
  while (next < stops.length) {
    const origin = next > 0 ? stops[next - 1] : undefined;
    let count = Math.min(MAX_STOPS_PER_LEG, stops.length - next);
    let url = directionsUrl(origin, stops.slice(next, next + count));
    // A single stop always goes, even if absurdly long: skipping it would break the route.
    while (url.length > MAX_URL_LENGTH && count > 1) {
      count--;
      url = directionsUrl(origin, stops.slice(next, next + count));
    }
    legs.push({ url, from: next + 1, to: next + count });
    next += count;
  }
  return legs;
}
