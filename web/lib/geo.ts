// Tipos y normalizadores de ubicación. El navegador solo habla con /api/geo/*; los proveedores
// (Georef, Photon, Nominatim) se consultan desde el servidor (ver geo-server.ts).

export type Coords = { lat: number; lng: number };

export type LocalidadSuggestion = Coords & { nombre: string; partido: string; provincia: string };

/** `exacta` indica que el punto corresponde a una puerta y no a la calle entera. */
export type DireccionSuggestion = Coords & { calle: string; altura?: string; localidad: string; partido: string; exacta: boolean };

export type LugarCaptado = Coords & {
  direccion: string;
  tieneAltura: boolean;
  localidad: string;
  partido: string;
  provincia: string;
  /** Dentro de la zona "Buenos Aires" del formulario (provincia de Buenos Aires o CABA). */
  enZona: boolean;
};

export type GeoError = "link-invalido" | "sin-coordenadas" | "sin-servicio";

const ZONA = ["Buenos Aires", "Ciudad Autónoma de Buenos Aires"];

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

type GeorefLocalidad = {
  nombre?: string;
  departamento?: { nombre?: string };
  provincia?: { nombre?: string };
  centroide?: { lat?: number; lon?: number };
};

/** Georef repite localidades (entidad y localidad censal): se deduplican por nombre y partido. */
export function localidadesFromGeoref(localidades: GeorefLocalidad[], max = 8): LocalidadSuggestion[] {
  const seen = new Set<string>();
  const out: LocalidadSuggestion[] = [];
  for (const l of localidades) {
    const nombre = l.nombre?.trim();
    const { lat, lon } = l.centroide ?? {};
    if (!nombre || typeof lat !== "number" || typeof lon !== "number") continue;
    const partido = l.departamento?.nombre ?? "";
    const key = fold(`${nombre}|${partido}`);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ nombre, partido, provincia: l.provincia?.nombre ?? "", lat, lng: lon });
    if (out.length === max) break;
  }
  return out;
}

type PhotonFeature = {
  properties?: {
    type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    district?: string;
    locality?: string;
    county?: string;
    state?: string;
    countrycode?: string;
  };
  geometry?: { coordinates?: [number, number] };
};

/** Calles y puertas de Photon dentro de Buenos Aires/CABA, sin repetidos. */
export function direccionesFromPhoton(features: PhotonFeature[], max = 6): DireccionSuggestion[] {
  const seen = new Set<string>();
  const out: DireccionSuggestion[] = [];
  for (const f of features) {
    const p = f.properties ?? {};
    const [lng, lat] = f.geometry?.coordinates ?? [];
    if (p.countrycode !== "AR" || (p.state && !ZONA.includes(p.state))) continue;
    if (p.type !== "street" && p.type !== "house") continue;
    const exacta = p.type === "house";
    const calle = (exacta ? p.street : p.name)?.trim();
    if (!calle || typeof lat !== "number" || typeof lng !== "number") continue;
    if (exacta && !p.housenumber) continue;
    const localidad = p.city ?? p.district ?? p.locality ?? "";
    const key = fold(`${calle}|${p.housenumber ?? ""}|${localidad}`);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ calle, altura: exacta ? p.housenumber : undefined, localidad, partido: p.county ?? "", exacta, lat, lng });
    if (out.length === max) break;
  }
  return out;
}

/** Deja las sugerencias cuya calle contiene todas las palabras escritas (sin la altura); si ninguna coincide, no filtra. */
export function filtrarPorCalle(items: DireccionSuggestion[], query: string): DireccionSuggestion[] {
  const words = fold(query)
    .replace(/\s+\d{1,5}$/, "")
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  const matches = items.filter((i) => words.every((w) => fold(i.calle).includes(w)));
  return matches.length > 0 ? matches : items;
}

type NominatimReverse = {
  address?: {
    road?: string;
    pedestrian?: string;
    house_number?: string;
    town?: string;
    city?: string;
    village?: string;
    suburb?: string;
    state_district?: string;
    state?: string;
    "ISO3166-2-lvl4"?: string;
  };
};

/** Arma el lugar a confirmar a partir de la respuesta de Nominatim; conserva el punto original del link. */
export function lugarFromNominatim(json: NominatimReverse, coords: Coords): LugarCaptado {
  const a = json.address ?? {};
  const iso = a["ISO3166-2-lvl4"];
  const caba = iso === "AR-C";
  const calle = a.road ?? a.pedestrian ?? "";
  return {
    ...coords,
    direccion: [calle, a.house_number].filter(Boolean).join(" "),
    tieneAltura: Boolean(calle && a.house_number),
    // En CABA "city" es toda la ciudad; el barrio es lo que sirve como localidad.
    localidad: (caba ? (a.suburb ?? a.city) : (a.town ?? a.city ?? a.village ?? a.suburb)) ?? "",
    partido: a.state_district ?? "",
    provincia: a.state ?? (caba ? "Ciudad Autónoma de Buenos Aires" : ""),
    enZona: iso === "AR-B" || caba,
  };
}

/** Altura escrita al final de la búsqueda ("agustina de aragon 520" → "520"), si no es parte del nombre de la calle elegida. */
export function alturaEscrita(query: string, calle: string): string | undefined {
  const altura = query.trim().match(/\D\s+(\d{1,5})$/)?.[1];
  if (!altura) return undefined;
  return fold(calle).split(/\s+/).includes(altura) ? undefined : altura;
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { signal });
  return (await res.json()) as T;
}

export async function fetchLocalidades(q: string, signal?: AbortSignal) {
  return (await getJson<{ items: LocalidadSuggestion[] }>(`/api/geo/localidades?q=${encodeURIComponent(q)}`, signal)).items;
}

export async function fetchDirecciones(q: string, near: Coords | null, signal?: AbortSignal) {
  const bias = near ? `&lat=${near.lat}&lng=${near.lng}` : "";
  return (await getJson<{ items: DireccionSuggestion[] }>(`/api/geo/direcciones?q=${encodeURIComponent(q)}${bias}`, signal)).items;
}

export async function fetchUbicacion(url: string): Promise<{ lugar: LugarCaptado } | { error: GeoError }> {
  try {
    return await getJson(`/api/geo/ubicacion?url=${encodeURIComponent(url)}`);
  } catch {
    return { error: "sin-servicio" };
  }
}
