import type { ChatResponse, Property } from "./types";
import { MAX_PROPERTIES_IN_ANSWER } from "./config";
import { retrieve, contextoConsulta } from "./retrieval";
import { generarRespuesta } from "./generate";
import { clasificar } from "./intent";
import { chunkToProperty, chunkToSource } from "./text";

/** End-to-end: question in, grounded answer + cards + sources out. */
export async function answerQuestion(query: string): Promise<ChatResponse> {
  // Deterministic small-talk first: greetings, "who are you", thanks, gibberish
  // get a fixed reply with no retrieval and no LLM call (cheaper + can't invent).
  const canned = clasificar(query);
  if (canned) {
    return { answer: canned.answer, properties: [], sources: [] };
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

  const answer = await generarRespuesta(query, chunks, properties, contextoConsulta(query));

  // Provenance only, de-duplicated: one entry per (document, type), not one per
  // retrieved chunk. Avoids "Catálogo · Catálogo · Catálogo" and leaks nothing.
  const seenSrc = new Set<string>();
  const sources = [];
  for (const c of chunks) {
    const s = chunkToSource(c);
    const key = `${s.fuente}|${s.categoria}`;
    if (!seenSrc.has(key)) {
      seenSrc.add(key);
      sources.push(s);
    }
  }

  return { answer, properties, sources };
}