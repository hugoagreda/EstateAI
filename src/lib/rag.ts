import type { ChatResponse, Property } from "./types";
import { MAX_PROPERTIES_IN_ANSWER } from "./config";
import { retrieve, contextoConsulta, buscarAlternativas } from "./retrieval";
import { generarRespuesta } from "./generate";
import { clasificar } from "./intent";
import { chunkToProperty, chunkToSource } from "./text";

/** End-to-end: question in, grounded answer + cards + sources out. */
export async function answerQuestion(query: string): Promise<ChatResponse> {
  // Deterministic small-talk first: greetings, "who are you", thanks, gibberish
  // get a fixed reply with no retrieval and no LLM call (cheaper + can't invent).
  const canned = clasificar(query);
  if (canned) {
    return { answer: canned.answer, properties: [], alternatives: [], sources: [] };
  }

  const scored = await retrieve(query);
  const chunks = scored.map((s) => s.chunk);

  const properties: Property[] = [];
  const seen = new Set<number>();
  for (const c of chunks) {
    const p = chunkToProperty(c);
    if (p && !seen.has(p.id)) {
      seen.add(p.id);
      properties.push(p);
      if (properties.length >= MAX_PROPERTIES_IN_ANSWER) break;
    }
  }

  const ctx = contextoConsulta(query);

  // Block 2 — near matches. Only when the visitor was after listings, the exact
  // block came back thin (0–2), and there was something to relax (zona/filter).
  const alternatives: Property[] = [];
  if (ctx.pediaListado && properties.length <= 2 && (ctx.zona != null || ctx.hayFiltro)) {
    const exactIds = new Set(properties.map((p) => p.id));
    for (const c of buscarAlternativas(query, exactIds)) {
      const p = chunkToProperty(c);
      if (p) alternatives.push(p);
    }
  }

  const answer = await generarRespuesta(query, chunks, properties, alternatives, ctx);

  // Provenance only, de-duplicated. Include the listing source when block-2
  // surfaced listings even though the exact block was empty.
  const chunksParaFuentes = alternatives.length > 0
    ? [...chunks, ...buscarAlternativas(query, new Set(properties.map((p) => p.id)))]
    : chunks;
  const seenSrc = new Set<string>();
  const sources = [];
  for (const c of chunksParaFuentes) {
    const s = chunkToSource(c);
    const key = `${s.fuente}|${s.categoria}`;
    if (!seenSrc.has(key)) {
      seenSrc.add(key);
      sources.push(s);
    }
  }

  return { answer, properties, alternatives, sources };
}