import type { Chunk } from "./types";
import { CHUNKS, ZONAS } from "./chunks";
import { normalizar, tokenizar } from "./text";
import { parseFiltros, pasaFiltros, hayFiltroDeListado, availRank } from "./filters";
import {
  MODE, TOP_K, MODELO_EMBEDDING, OPENAI_API_KEY,
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
} from "./config";

export interface Scored {
  chunk: Chunk;
  score: number; // higher = more relevant (mock) / similarity (live)
}

/* ------------------------------------------------------------------ *
 * MOCK retrieval — lexical. Runs fully offline over data/chunks.json. *
 * Not a semantic model: token overlap + light domain boosts. Good     *
 * enough to demo the UI and the "answers anchored to your data" flow. *
 * ⚠️ LIKELY-ADJUST: tune BOOST_* weights if ranking feels off.        *
 * ------------------------------------------------------------------ */
const BOOST_ZONA = 3.0;        // query mentions a known zona and chunk is in it
const BOOST_CATEGORIA = 1.5;   // query intent matches chunk category
const BOOST_TITULO = 2.0;      // token appears in a property title
const BOOST_DISPONIBLE = 0.5;  // tie-breaker for available listings (only if already relevant)
const BOOST_BARRIO_INTENT = 6; // "cómo es el barrio X" → barrio chunk leads over pisos

// Domain words so common across the corpus that a single overlap on them is NOT
// evidence of relevance ("piso" appears in every listing). They still add to the
// ranking score once a chunk already qualifies, but they can't, on their own,
// qualify a chunk as relevant. This is what stops "¿puedo tener un perro en el
// piso?" from surfacing listings: "piso" matches, but it's generic, so with no
// specific signal (a zona, "arras", "terraza"…) the chunk does not qualify and
// the answer becomes an honest "no tengo ese dato". Tokens are pre-normalized.
const GENERIC_TERMS = new Set<string>([
  "piso", "pisos", "vivienda", "viviendas", "casa", "casas",
  "inmueble", "inmuebles", "propiedad", "propiedades", "apartamento", "apartamentos",
]);

// Words that signal "show me the catalogue" rather than a specific need. Like
// GENERIC_TERMS, they don't count as specific signal by themselves, but combined
// with a listing noun and nothing else they mean the visitor wants to browse.
// (normalized, accent-free)
const BROWSE_WORDS = new Set<string>([
  "ver", "muestrame", "muestra", "ensename", "ensena", "mostrar", "ensenar",
  "listado", "lista", "catalogo", "oferta", "ofertas", "disponible", "disponibles",
  "todos", "todas", "opciones", "cuales", "cuantos", "cuantas",
]);
// Filter keywords: they express a constraint, not knowledge-base content. They
// must NOT qualify a chunk (e.g. "hasta" appears in the proceso text, which used
// to make "pisos hasta 300000" wrongly lead with the buying-process passage).
const FILTER_WORDS = new Set<string>([
  "hasta", "debajo", "bajo", "inferior", "maximo", "max", "millon", "millones",
  "mil", "habitacion", "habitaciones", "dormitorio", "dormitorios", "hab",
  "precio", "presupuesto",
]);

// Browse intent = the query names a listing (generic term) and every other
// content token is just a browse word. "¿qué pisos tenéis?" / "muéstrame pisos"
// / "pisos disponibles" → browse. "perro en el piso" has a foreign token
// ("perro") → NOT browse, so it still needs a specific signal to return listings.
function esBrowse(qTokens: string[]): boolean {
  let hasListingNoun = false;
  for (const t of qTokens) {
    if (GENERIC_TERMS.has(t)) { hasListingNoun = true; continue; }
    if (BROWSE_WORDS.has(t)) continue;
    return false; // a foreign content token → not a plain browse request
  }
  return hasListingNoun;
}

// Key domain terms a visitor might misspell. Typo correction runs ONLY against
// this closed set (plus zonas) — never against the whole corpus — so "aras"
// becomes "arras" but common function words like "puedo" are left untouched and
// can't accidentally match "puede". Curated from the real doc/ sources.
const DOMAIN_TERMS = [
  "arras", "hipoteca", "notaria", "registro", "reserva", "tasacion", "escritura",
  "contrato", "plusvalia", "financiacion", "comunidad", "terraza", "garaje",
  "ascensor", "calefaccion", "reformado", "amueblado", "trastero", "exterior",
  "interior", "alquiler", "compra", "vivienda", "requisitos", "gastos", "aval",
];

// Closed correction vocabulary: zonas + domain terms, all normalized.
function buildVocab(): string[] {
  const v = new Set<string>(DOMAIN_TERMS);
  for (const z of ZONAS) v.add(normalizar(z));
  return [...v];
}
const VOCAB = buildVocab();

// Spell-correct each query token against the closed vocab. A token that already
// matches (or matches nothing close) is left as-is. This is the ONLY place typo
// tolerance happens, which keeps it predictable and safe.
function corregir(qTokens: string[]): string[] {
  return qTokens.map((t) => {
    if (VOCAB.includes(t)) return t;
    for (const w of VOCAB) if (casiIgual(t, w)) return w;
    return t;
  });
}

// Edit distance (Levenshtein), small and dependency-free. Used ONLY for typo
// tolerance with a tight, length-scaled threshold — never a loose match.
function distancia(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let diag = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      row[j] = Math.min(
        row[j] + 1,                              // deletion
        row[j - 1] + 1,                          // insertion
        diag + (a[i - 1] === b[j - 1] ? 0 : 1),  // substitution
      );
      diag = tmp;
    }
  }
  return row[n];
}

// Typo tolerance with a deliberately tight threshold: short words demand an
// exact match (they collide too easily), longer words allow 1–2 edits. Lets
// "chanberi"→"chamberi" and "aras"→"arras" through without loosening the gate.
function casiIgual(a: string, b: string): boolean {
  if (a === b) return true;
  const len = Math.max(a.length, b.length);
  if (len < 5) return false;             // too short → exact only
  const tol = len >= 8 ? 2 : 1;
  return distancia(a, b) <= tol;
}

function detectarZona(qNorm: string, qTokens: string[]): string | null {
  for (const z of ZONAS) {
    const zn = normalizar(z);
    if (qNorm.includes(zn)) return z;             // exact (also multi-word)
    if (qTokens.includes(zn)) return z;           // corrected token equals zona
  }
  return null;
}

// crude intent detection, only to bias category — never to fabricate data
function intentCategoria(qNorm: string): string | null {
  if (/\b(piso|pisos|vivienda|casa|chalet|estudio|atico|alquil|compra|comprar|habitac|terraza|garaje|precio|euros?)\b/.test(qNorm)) return "inmueble";
  if (/\b(barrio|zona|chamberi|salamanca|retiro|vallecas|chamartin|malasana|lavapies|moncloa|ambiente|vivir)\b/.test(qNorm)) return "barrio";
  if (/\b(arras|hipoteca|notari|registro|reserva|proceso|tramite|documenta|firma|tasacion)\b/.test(qNorm)) return "proceso";
  if (/\b(quien|quienes|servicio|horario|contacto|ibi|comunidad|privacidad|requisito|gasto)\b/.test(qNorm)) return "faq";
  return null;
}

function scoreLexico(
  qTokens: string[],
  zona: string | null,
  intent: string | null,
  listingIntent: boolean,
  chunk: Chunk,
): number {
  const m = chunk.metadata;
  const textSet = new Set(tokenizar(chunk.texto));

  // Lexical overlap on ALREADY-corrected query tokens (typos fixed upstream
  // against a closed vocabulary). `overlap` counts every match (ranking);
  // `meaningfulOverlap` counts only SPECIFIC matches — not generic listing
  // nouns, not browse words, not filter keywords — and is what decides relevance.
  let overlap = 0;
  let meaningfulOverlap = 0;
  for (const qt of qTokens) {
    if (textSet.has(qt)) {
      overlap += 1;
      if (!GENERIC_TERMS.has(qt) && !BROWSE_WORDS.has(qt) && !FILTER_WORDS.has(qt)) {
        meaningfulOverlap += 1;
      }
    }
  }

  // A chunk qualifies if it has a SPECIFIC signal (a non-generic token match or
  // the query named its zona) — the confidence gate that stops a lone "piso"
  // from surfacing listings. A LISTING also qualifies under listing intent:
  // browsing the catalogue OR any active hard filter (zona/precio/tipo/…). That
  // way "estudios nuevos" (plural, no lexical match) still surfaces, and the
  // hard filters below decide what stays. Boosts never create relevance alone.
  const zonaMatch = zona != null && m.zona === zona;
  const listingQualifies = listingIntent && m.categoria === "inmueble";
  const qualifies = meaningfulOverlap > 0 || zonaMatch || listingQualifies;
  if (!qualifies) return 0;

  // On a plain browse with no other signal, give listings a small base so they
  // rank and the availability tie-breaker can order them.
  let score = overlap;
  if (listingQualifies && overlap === 0) score += 1;
  if (zonaMatch) score += BOOST_ZONA;
  if (intent && m.categoria === intent) score += BOOST_CATEGORIA;

  // "cómo es el barrio X" → the barrio description should lead over listings.
  if (intent === "barrio" && m.categoria === "barrio" && zonaMatch) {
    score += BOOST_BARRIO_INTENT;
  }

  if (m.categoria === "inmueble") {
    const titSet = new Set(tokenizar(m.titulo ?? ""));
    for (const qt of qTokens) if (titSet.has(qt)) score += BOOST_TITULO;
    // tie-breaker only, applied after the chunk already qualified
    if ((m.disponibilidad ?? "").toLowerCase() === "disponible") score += BOOST_DISPONIBLE;
  }

  return score;
}

function retrieveMock(query: string, topK: number): Scored[] {
  const qNorm = normalizar(query);
  const qTokens = corregir(tokenizar(query));       // typo-correct once, upstream
  const qNormCorr = qTokens.join(" ");              // corrected text for intent/zona
  const zona = detectarZona(qNorm, qTokens);
  const intent = intentCategoria(qNormCorr);
  const filtros = parseFiltros(qNorm);
  filtros.zona = zona; // zona comes from fuzzy detection, fold it into the hard filters

  // A listing should surface (and then be filtered) whenever the visitor is
  // browsing OR any hard filter is active — not only when a word lexically
  // matched. This is what makes "estudios nuevos" (plural) and pure filter
  // queries work. Lead with cards (not the barrio text) when the user is
  // clearly after listings: browse, a listing filter, or inmueble intent.
  const listingIntent = esBrowse(qTokens) || zona != null || hayFiltroDeListado(filtros);
  const preferListings = esBrowse(qTokens) || hayFiltroDeListado(filtros) || intent === "inmueble";

  const scored = CHUNKS.map((chunk) => ({ chunk, score: scoreLexico(qTokens, zona, intent, listingIntent, chunk) }))
    .filter((s) => s.score > 0)
    // Hard filters apply to listings only; other chunks (barrio/proceso/faq) pass.
    .filter((s) => s.chunk.metadata.categoria !== "inmueble" || pasaFiltros(s.chunk.metadata, filtros))
    .sort((A, B) => {
      const a = A.chunk.metadata, b = B.chunk.metadata;
      const ai = a.categoria === "inmueble", bi = b.categoria === "inmueble";
      // Lead with listings when the visitor is after listings.
      if (preferListings && ai !== bi) return ai ? -1 : 1;
      if (ai && bi) {
        const av = availRank(a) - availRank(b);   // disponibles first, reservados last
        if (av !== 0) return av;
        // Explicit "barato" → asc; explicit "caro" OR a budget ceiling → desc
        // (show the priciest within budget first: closest to what they can spend).
        const ord = filtros.orden ?? (filtros.precioMax != null ? "caro" : null);
        if (ord === "barato") return (a.precio ?? Infinity) - (b.precio ?? Infinity);
        if (ord === "caro") return (b.precio ?? -1) - (a.precio ?? -1);
      }
      return B.score - A.score;                    // otherwise by relevance
    });

  return scored.slice(0, topK);
}

/* ------------------------------------------------------------------ *
 * LIVE retrieval — OpenAI embeddings + Supabase pgvector.            *
 * Requires network. Activated only when ESTATEAI_MODE=live.         *
 * Uses fetch (no SDKs). Expects the RPC in supabase/schema.sql.      *
 * ------------------------------------------------------------------ */
async function embedQuery(query: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: MODELO_EMBEDDING, input: query }),
  });
  if (!res.ok) throw new Error(`OpenAI embeddings ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data[0].embedding as number[];
}

async function retrieveLive(query: string, topK: number): Promise<Scored[]> {
  const embedding = await embedQuery(query);
  // Calls the SQL function match_chunks(query_embedding, match_count).
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_chunks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query_embedding: embedding, match_count: topK }),
  });
  if (!res.ok) throw new Error(`Supabase match_chunks ${res.status}: ${await res.text()}`);
  const rows = (await res.json()) as Array<{ id: string; texto: string; metadata: Chunk["metadata"]; similarity: number }>;
  return rows.map((r) => ({ chunk: { id: r.id, texto: r.texto, metadata: r.metadata }, score: r.similarity }));
}

export async function retrieve(query: string, topK: number = TOP_K): Promise<Scored[]> {
  return MODE === "live" ? retrieveLive(query, topK) : retrieveMock(query, topK);
}

/** Lightweight query context for the answer layer: which zona (if any) and
 *  whether the visitor was clearly after listings (so we don't reply with a
 *  neighbourhood description when they asked for flats). */
export function contextoConsulta(query: string): { zona: string | null; pediaListado: boolean; hayFiltro: boolean } {
  const qNorm = normalizar(query);
  const qTokens = corregir(tokenizar(query));
  const zona = detectarZona(qNorm, qTokens);
  const filtros = parseFiltros(qNorm);
  filtros.zona = zona;
  const hayFiltro = hayFiltroDeListado(filtros);
  const pediaListado =
    esBrowse(qTokens) || hayFiltro || intentCategoria(qTokens.join(" ")) === "inmueble";
  return { zona, pediaListado, hayFiltro };
}