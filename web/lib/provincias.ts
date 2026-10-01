// Provincias fuera de Buenos Aires (CABA y provincia de Buenos Aires se cubren con la opción "Buenos Aires").
export const provincias = [
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
] as const;

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Provincias que coinciden con lo escrito, sin distinguir mayúsculas ni acentos. */
export function filterProvincias(query: string) {
  const q = fold(query);
  return q ? provincias.filter((p) => fold(p).includes(q)) : [...provincias];
}
