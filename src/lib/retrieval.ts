import type { Chunk } from "./types";
import { CHUNKS, ZONAS } from "./chunks";
import { normalizar, tokenizar } from "./text";
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

function detectarZona(qNorm: string): string | null {
  for (const z of ZONAS) {
    if (qNorm.includes(normalizar(z))) return z;
  }
  return null;
}

// Parse a max price from natural language: "menos de 600.000", "por debajo de
// 600000", "hasta 600 000 €", "máximo 600k". Returns null if none.
function detectarPrecioMax(qNorm: string): number | null {
  const m = qNorm.match(/(?:menos de|por debajo de|hasta|maximo|max|bajo|inferior a)\s*([\d.\s]+)(k)?/);
  if (!m) return null;
  const digits = m[1].replace(/[^\d]/g, "");
  if (!digits) return null;
  let val = Number(digits);
  if (m[2] === "k") val *= 1000;
  return Number.isFinite(val) && val > 0 ? val : null;
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
  chunk: Chunk,
): number {
  const m = chunk.metadata;
  const textSet = new Set(tokenizar(chunk.texto));

  // Base lexical overlap.
  let overlap = 0;
  for (const qt of qTokens) if (textSet.has(qt)) overlap += 1;

  // A chunk must have a REAL signal to qualify: token overlap, OR the query
  // named this chunk's zona. Boosts alone never create relevance from nothing
  // (this is what made out-of-domain questions wrongly return listings).
  const zonaMatch = zona != null && m.zona === zona;
  const qualifies = overlap > 0 || zonaMatch;
  if (!qualifies) return 0;

  let score = overlap;
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
  const qTokens = tokenizar(query);
  const zona = detectarZona(qNorm);
  const intent = intentCategoria(qNorm);
  const precioMax = detectarPrecioMax(qNorm);

  const scored = CHUNKS.map((chunk) => ({ chunk, score: scoreLexico(qTokens, zona, intent, chunk) }))
    .filter((s) => s.score > 0)
    // Hard price filter: if the user set a max, never surface a pricier flat.
    .filter((s) => {
      if (precioMax == null) return true;
      if (s.chunk.metadata.categoria !== "inmueble") return true;
      return (s.chunk.metadata.precio ?? 0) <= precioMax;
    })
    .sort((a, b) => b.score - a.score);

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
