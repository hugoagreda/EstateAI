import type { ChatResponse, Property } from "./types";
import { MODE, MAX_PROPERTIES_IN_ANSWER } from "./config";
import { retrieve } from "./retrieval";
import { generarRespuesta } from "./generate";
import { chunkToProperty, chunkToSource } from "./text";

/** End-to-end: question in, grounded answer + cards + sources out. */
export async function answerQuestion(query: string): Promise<ChatResponse> {
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

  const answer = await generarRespuesta(query, chunks, properties);
  const sources = chunks.map(chunkToSource);

  return { answer, properties, sources, engine: MODE };
}
