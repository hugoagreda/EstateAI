import type { Chunk, Property, SourceRef } from "./types";

/** Mirror of the notebook's normalizar_texto: lowercase + strip accents. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const STOPWORDS = new Set([
  "el","la","los","las","un","una","unos","unas","de","del","al","a","en","y","o","u",
  "con","sin","por","para","que","cual","cuales","cuanto","cuanta","como","donde","hay",
  "teneis","teneis","tienes","tiene","busco","buscar","quiero","necesito","me","mi","mis",
  "es","son","esta","estan","este","esta","estos","estas","se","su","sus","lo","le","les",
  "sobre","mas","menos","muy","tambien","pero","si","no","hola","por favor","porfa",
]);

export function tokenizar(texto: string): string[] {
  return normalizar(texto)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Turn an "inmueble" chunk into a Property for the card UI.
 *  ⚠️ SECURITY (F12 whitelist): this is the ONLY shape sent to the browser for a
 *  listing. Fields are listed EXPLICITLY here — never spread the raw metadata.
 *  In `live`, when the client DB may hold internal fields (owner phone, agency
 *  margin, private notes…), they must NOT be added here; only public fields go
 *  out, so nothing sensitive can leak through the Network tab. */
export function chunkToProperty(chunk: Chunk): Property | null {
  const m = chunk.metadata;
  if (m.categoria !== "inmueble" || m.id_inmueble == null) return null;
  return {
    id: m.id_inmueble,
    titulo: m.titulo ?? "",
    zona: m.zona ?? "",
    precio: m.precio ?? 0,
    m2: m.m2 ?? 0,
    habitaciones: m.habitaciones ?? 0,
    banos: m.banos ?? 0,
    tipo: m.tipo ?? "",
    estado: m.estado ?? "",
    disponibilidad: m.disponibilidad ?? "",
    extras: m.extras ?? [],
    descripcion: m.descripcion ?? "",
    imagen: m.enlace ?? "",
  };
}

/** Provenance for the sources panel: document name + type ONLY. Never the
 *  chunk text — returning the retrieved content would leak catalogue rows (and,
 *  for other sectors, potentially sensitive passages). Security > detail. */
export function chunkToSource(chunk: Chunk): SourceRef {
  const m = chunk.metadata;
  return { fuente: m.fuente, categoria: m.categoria };
}

export function formatearPrecio(precio: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(precio);
}