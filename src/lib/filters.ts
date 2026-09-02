import type { ChunkMetadata } from "./types";
import { normalizar } from "./text";

/* ------------------------------------------------------------------ *
 * FILTROS — módulo compartido (mock + live).                          *
 * Perfil inmobiliaria: los vocabularios y sinónimos viven aquí; la    *
 * lógica de parseo/aplicación/orden es genérica. Para otro nicho se   *
 * cambia el bloque de config sin tocar el motor de retrieval.         *
 * ------------------------------------------------------------------ */

// Extras canónicos + sinónimos que la gente escribe de otra forma.
const EXTRAS_CONOCIDOS = ["terraza", "garaje", "ascensor", "trastero", "balcon", "piscina", "jardin"];
const EXTRAS_SINONIMOS: Record<string, string> = {
  parking: "garaje", aparcamiento: "garaje", "plaza de garaje": "garaje", cochera: "garaje",
  alberca: "piscina",
  elevador: "ascensor",
  "zona verde": "jardin", jardines: "jardin",
  balcones: "balcon", terrazas: "terraza", trasteros: "trastero",
};
// "piso" queda FUERA a propósito: es el término genérico de catálogo, no un tipo.
const TIPOS_CONOCIDOS = ["atico", "estudio", "chalet", "duplex"];
const ESTADOS_CONOCIDOS = ["reformado", "nuevo"];
const NUM_PALABRA: Record<string, number> = { medio: 0.5, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6 };

export interface Filtros {
  zona: string | null;
  precioMin: number | null;
  precioMax: number | null;
  habitacionesMin: number | null;
  banosMin: number | null;
  m2Min: number | null;
  m2Max: number | null;
  tipo: string | null;
  estado: string | null;
  extras: string[];
  orden: "barato" | "caro" | null;
}

/* ---------- parseo de importes en lenguaje natural ---------- */
// Devuelve valor + factor (1 / 1.000 / 1.000.000) para poder heredar unidad en rangos.
function parseImporte(frag: string): { value: number; factor: number } | null {
  // Drop leading articles/prepositions left over from "del millón", "de un millón", etc.
  const f = frag.trim().replace(/^(?:l|el|la|los|las|un|una|de|del|d)\s+/,"").trim();
  let m = f.match(/^([\d]+(?:[.,][\d]+)?|medio|un|uno|una|dos|tres|cuatro|cinco)\s*millon(?:es)?/);
  if (m) {
    const mult = NUM_PALABRA[m[1]] ?? Number(m[1].replace(",", "."));
    if (Number.isFinite(mult) && mult > 0) return { value: Math.round(mult * 1_000_000), factor: 1_000_000 };
  }
  if (/^millon(?:es)?\b/.test(f)) return { value: 1_000_000, factor: 1_000_000 }; // "millón" a secas
  m = f.match(/^(\d[\d.]*)\s*mil\b/);
  if (m) {
    const n = Number(m[1].replace(/\./g, ""));
    if (Number.isFinite(n) && n > 0) return { value: n * 1000, factor: 1000 };
  }
  m = f.match(/^([\d][\d.\s]*)/);
  if (m) {
    const d = m[1].replace(/[^\d]/g, "");
    if (d) { const n = Number(d); if (n > 0) return { value: n, factor: 1 }; }
  }
  return null;
}

// Precio en lenguaje natural con rango / mínimo / máximo. Los números de m²,
// habitaciones y baños se quitan ANTES para que no se confundan con precio.
function parsePrecio(qNorm: string): { min: number | null; max: number | null } {
  const s = qNorm
    .replace(/(\d+)\s*(?:m2|m²|metros(?:\s+cuadrados)?)/g, " ")
    .replace(/(\d+|un|una|dos|tres|cuatro|cinco|seis)\s*(?:habitacion\w*|dormitorio\w*|hab)\b/g, " ")
    .replace(/(\d+|un|una|dos|tres|cuatro|cinco|seis)\s*(?:banos?|aseos?)\b/g, " ");

  const esPrecio = (imp: { value: number; factor: number }) => imp.factor > 1 || imp.value >= 1000;

  // Rango: "entre A y B", "de A a B" (con herencia de unidad: "entre 400 y 600 mil").
  let m = s.match(/(?:entre|de)\s+(.+?)\s+(?:y|a)\s+(.+)/);
  if (m) {
    let a = parseImporte(m[1]);
    const b = parseImporte(m[2]);
    if (a && b && esPrecio(b)) {
      if (a.factor === 1 && b.factor > 1 && a.value < b.factor) a = { value: a.value * b.factor, factor: b.factor };
      if (esPrecio(a)) return { min: Math.min(a.value, b.value), max: Math.max(a.value, b.value) };
    }
  }
  // Mínimo.
  m = s.match(/(?:a partir de|al menos|mas de|desde|minimo|superior a|por encima de)\s*(.+)/);
  if (m) { const imp = parseImporte(m[1]); if (imp && esPrecio(imp)) return { min: imp.value, max: null }; }
  // Máximo.
  m = s.match(/(?:menos de|por debajo de|debajo de|hasta|maximo|max|bajo|inferior a|no pase de|no supere)\s*(.+)/);
  if (m) { const imp = parseImporte(m[1]); if (imp && esPrecio(imp)) return { min: null, max: imp.value }; }
  // Presupuesto suelto: una expresión con unidad (mil/millón) sin comparador.
  m = s.match(/([\d]+(?:[.,][\d]+)?|medio|un|dos|tres|cuatro|cinco)\s*millon(?:es)?|(\d[\d.]*)\s*mil\b/);
  if (m) { const imp = parseImporte(m[0]); if (imp) return { min: null, max: imp.value }; }
  return { min: null, max: null };
}

function parseM2(qNorm: string): { min: number | null; max: number | null } {
  let m = qNorm.match(/(?:entre|de)\s+(\d+)\s+(?:y|a)\s+(\d+)\s*(?:m2|m²|metros)/);
  if (m) { const a = Number(m[1]), b = Number(m[2]); return { min: Math.min(a, b), max: Math.max(a, b) }; }
  m = qNorm.match(/(?:mas de|a partir de|minimo|al menos|desde|superior a|mayor de)\s*(\d+)\s*(?:m2|m²|metros)/);
  if (m) return { min: Number(m[1]), max: null };
  m = qNorm.match(/(?:menos de|hasta|maximo|max|inferior a|por debajo de)\s*(\d+)\s*(?:m2|m²|metros)/);
  if (m) return { min: null, max: Number(m[1]) };
  m = qNorm.match(/(\d+)\s*(?:m2|m²|metros(?:\s+cuadrados)?)/); // "100 metros" suelto → mínimo
  if (m) return { min: Number(m[1]), max: null };
  return { min: null, max: null };
}

function parseBanosMin(qNorm: string): number | null {
  const m = qNorm.match(/(\d+|un|una|dos|tres|cuatro|cinco)\s*(?:banos?|aseos?)\b/);
  if (!m) return null;
  const n = NUM_PALABRA[m[1]] ?? Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseHabitacionesMin(qNorm: string): number | null {
  const m = qNorm.match(/(\d+|un|una|dos|tres|cuatro|cinco|seis)\s*(?:habitacion|habitaciones|dormitorio|dormitorios|hab)\b/);
  if (!m) return null;
  const n = NUM_PALABRA[m[1]] ?? Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseOrden(qNorm: string): "barato" | "caro" | null {
  if (/\b(barat[oa]s?|economic[oa]s?|asequibles?|mas barat)\b/.test(qNorm)) return "barato";
  if (/\b(mas car|caros?|lujos[oa]s?)\b/.test(qNorm)) return "caro";
  return null;
}

function parseExtras(qNorm: string): string[] {
  const out = new Set<string>();
  for (const e of EXTRAS_CONOCIDOS) if (qNorm.includes(e)) out.add(e);
  for (const [syn, canon] of Object.entries(EXTRAS_SINONIMOS)) if (qNorm.includes(syn)) out.add(canon);
  return [...out];
}

/** Parse all listing constraints from the normalized query (zona set by caller). */
export function parseFiltros(qNorm: string): Filtros {
  const precio = parsePrecio(qNorm);
  const m2 = parseM2(qNorm);
  return {
    zona: null,
    precioMin: precio.min,
    precioMax: precio.max,
    habitacionesMin: parseHabitacionesMin(qNorm),
    banosMin: parseBanosMin(qNorm),
    m2Min: m2.min,
    m2Max: m2.max,
    tipo: TIPOS_CONOCIDOS.find((t) => qNorm.includes(t)) ?? null,
    estado: ESTADOS_CONOCIDOS.find((s) => qNorm.includes(s)) ?? null,
    extras: parseExtras(qNorm),
    orden: parseOrden(qNorm),
  };
}

/** True if any listing filter (beyond zona) is active — used to lead with cards. */
export function hayFiltroDeListado(f: Filtros): boolean {
  return (
    f.precioMin != null || f.precioMax != null || f.habitacionesMin != null ||
    f.banosMin != null || f.m2Min != null || f.m2Max != null ||
    f.tipo != null || f.estado != null || f.extras.length > 0 || f.orden != null
  );
}

/** A listing satisfies ALL detected hard constraints. Availability is NOT a
 *  filter (reserved listings are kept, then pushed to the end by the sort). */
export function pasaFiltros(m: ChunkMetadata, f: Filtros): boolean {
  if (f.zona != null && normalizar(m.zona ?? "") !== normalizar(f.zona)) return false;
  if (f.precioMax != null && (m.precio ?? Infinity) > f.precioMax) return false;
  if (f.precioMin != null && (m.precio ?? 0) < f.precioMin) return false;
  if (f.habitacionesMin != null && (m.habitaciones ?? 0) < f.habitacionesMin) return false;
  if (f.banosMin != null && (m.banos ?? 0) < f.banosMin) return false;
  if (f.m2Max != null && (m.m2 ?? Infinity) > f.m2Max) return false;
  if (f.m2Min != null && (m.m2 ?? 0) < f.m2Min) return false;
  if (f.tipo != null && normalizar(m.tipo ?? "") !== f.tipo) return false;
  if (f.estado != null && normalizar(m.estado ?? "") !== f.estado) return false;
  if (f.extras.length) {
    const propExtras = (m.extras ?? []).map(normalizar);
    for (const e of f.extras) if (!propExtras.includes(e)) return false;
  }
  return true;
}

/** disponible → 0, anything else (reservado) → 1. Available listings sort first. */
export function availRank(m: ChunkMetadata): number {
  return normalizar(m.disponibilidad ?? "") === "disponible" ? 0 : 1;
}