import "server-only";
import {
  direccionesFromPhoton,
  filtrarPorCalle,
  localidadesFromGeoref,
  lugarFromNominatim,
  type Coords,
  type DireccionSuggestion,
  type GeoError,
  type LocalidadSuggestion,
  type LugarCaptado,
} from "@/lib/geo";
import { isGoogleHost, isMapsUrl, parseMapsUrl } from "@/lib/maps-url";
import { site } from "@/lib/site";

const GEOREF = "https://apis.datos.gob.ar/georef/api";
const PHOTON = "https://photon.komoot.io/api";
const NOMINATIM = "https://nominatim.openstreetmap.org";

// Nominatim exige identificar la aplicación.
const HEADERS = { "User-Agent": `AccFenix/1.0 (+${site.url})`, Accept: "application/json" };
const TIMEOUT_MS = 5000;
const DAY = 60 * 60 * 24;
// Provincia de Buenos Aires + CABA: lon mín, lat mín, lon máx, lat máx.
const BBOX = "-63.4,-41.1,-56.6,-33.2";
const MAX_REDIRECTS = 5;

async function getJson<T>(url: string, revalidate: number): Promise<T> {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS), next: { revalidate } });
  if (!res.ok) throw new Error(`${new URL(url).hostname} respondió ${res.status}`);
  return (await res.json()) as T;
}

/** Localidades de la provincia de Buenos Aires (06) y de CABA (02) que coinciden con lo escrito. */
export async function searchLocalidades(q: string): Promise<LocalidadSuggestion[]> {
  const query = (provincia: string) =>
    getJson<{ localidades: Parameters<typeof localidadesFromGeoref>[0] }>(
      `${GEOREF}/localidades?nombre=${encodeURIComponent(q)}&provincia=${provincia}&campos=nombre,departamento.nombre,provincia.nombre,centroide&max=10`,
      DAY,
    );
  const results = await Promise.allSettled([query("06"), query("02")]);
  if (results.every((r) => r.status === "rejected")) throw new Error("Georef no disponible");
  return localidadesFromGeoref(results.flatMap((r) => (r.status === "fulfilled" ? r.value.localidades : [])));
}

/** Calles y direcciones mientras se escribe, sesgadas hacia `near` (el centro de la localidad elegida). */
export async function searchDirecciones(q: string, near: Coords | null): Promise<DireccionSuggestion[]> {
  const bias = near ? `&lat=${near.lat}&lon=${near.lng}` : "";
  const query = async (text: string) => {
    const { features } = await getJson<{ features: Parameters<typeof direccionesFromPhoton>[0] }>(
      `${PHOTON}?q=${encodeURIComponent(text)}&limit=15&bbox=${BBOX}${bias}`,
      DAY,
    );
    // Con altura, Photon suma puertas de otras calles que solo comparten el número.
    return filtrarPorCalle(direccionesFromPhoton(features, 15), q).slice(0, 6);
  };
  const items = await query(q);
  if (items.length > 0) return items;
  // Con la altura incluida a veces no hay coincidencias: se reintenta solo con la calle.
  const sinAltura = q.replace(/\s+\d{1,5}\s*$/, "");
  return sinAltura !== q && sinAltura.length >= 3 ? query(sinAltura) : items;
}

/** Sigue links cortos hasta dar con coordenadas, sin salir de dominios de Google. */
async function resolveCoords(text: string): Promise<Coords | GeoError> {
  if (!isMapsUrl(text)) return "link-invalido";
  let url = new URL(text.trim());
  url.protocol = "https:";

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const coords = parseMapsUrl(url.href);
    if (coords) return coords;

    let res: Response;
    try {
      res = await fetch(url, { redirect: "manual", headers: { "User-Agent": HEADERS["User-Agent"] }, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    } catch {
      return "sin-servicio";
    }
    void res.body?.cancel();
    const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (!location) return "sin-coordenadas";

    const next = new URL(location, url);
    if (next.protocol !== "https:" || !isGoogleHost(next.hostname)) return "sin-coordenadas";
    url = next;
  }
  return "sin-coordenadas";
}

/** Convierte un link de Google Maps en un lugar con dirección para que el cliente lo confirme. */
export async function resolveMapsUrl(text: string): Promise<LugarCaptado | GeoError> {
  const coords = await resolveCoords(text);
  if (typeof coords === "string") return coords;
  try {
    const json = await getJson<Parameters<typeof lugarFromNominatim>[0]>(
      `${NOMINATIM}/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lng}&zoom=18&addressdetails=1&accept-language=es`,
      DAY,
    );
    return lugarFromNominatim(json, coords);
  } catch {
    return "sin-servicio";
  }
}
