import type { Chunk, Property } from "./types";
import { MODE, MODELO_LLM, OPENAI_API_KEY } from "./config";
import { formatearPrecio } from "./text";

// Ported verbatim (translated to a single system message) from the notebook's
// SistemaRAGInmobiliario.generar_respuesta. This is the anti-hallucination core
// and is the product's selling point — keep it strict.
const SYSTEM_PROMPT = `Eres un asistente inmobiliario preciso y prudente.

Tu tarea es responder únicamente usando la información presente en el CONTEXTO.

Reglas:
- No inventes información.
- No completes datos que no aparezcan en el contexto.
- Si algo no aparece en el contexto, dilo con claridad ("No tengo ese dato").
- Prioriza pisos cuando el usuario busque inmuebles.
- Responde de forma clara y breve, en español.`;

function construirContexto(chunks: Chunk[]): string {
  return chunks
    .map((c) => `[Fuente: ${c.metadata.fuente} | Categoría: ${c.metadata.categoria}]\n${c.texto}`)
    .join("\n\n---\n\n")
    .slice(0, 12000); // same cap as the notebook
}

/* ---- MOCK generation: no LLM. Compose an honest answer from retrieved data. ---- */
export function generarRespuestaMock(query: string, chunks: Chunk[], properties: Property[]): string {
  if (chunks.length === 0) {
    return "No he encontrado información sobre eso en los datos cargados. Prueba con otra pregunta sobre pisos, barrios, el proceso de compra/alquiler o servicios de la agencia.";
  }

  // Lead with listings only when the most relevant result IS a listing.
  // Otherwise (barrio / proceso / faq) lead with that passage, even if some
  // properties were also retrieved (they still render as cards below).
  const topEsInmueble = chunks[0]?.metadata.categoria === "inmueble";

  if (topEsInmueble && properties.length > 0) {
    const n = properties.length;
    const zonas = Array.from(new Set(properties.map((p) => p.zona)));
    const zonaTxt = zonas.length === 1 ? ` en ${zonas[0]}` : "";
    const cabecera =
      n === 1
        ? `He encontrado 1 inmueble que encaja${zonaTxt}:`
        : `He encontrado ${n} inmuebles que encajan${zonaTxt}:`;
    const lineas = properties
      .map((p) => `• ${p.titulo} — ${formatearPrecio(p.precio)} · ${p.m2} m² · ${p.habitaciones} hab · ${p.disponibilidad}`)
      .join("\n");
    return `${cabecera}\n${lineas}\n\nTienes las fichas completas debajo. (Respuesta generada en modo local a partir del catálogo, sin inventar datos.)`;
  }

  // Non-property answer: surface the most relevant retrieved passage, trimmed.
  const top = chunks[0];
  const texto = top.texto.length > 600 ? top.texto.slice(0, 600) + "…" : top.texto;
  return `${texto}\n\n(Respuesta anclada a: ${top.metadata.fuente}. Modo local, sin inventar datos.)`;
}

/* ---- LIVE generation: gpt-4o-mini via fetch. ---- */
export async function generarRespuestaLive(query: string, chunks: Chunk[]): Promise<string> {
  const contexto = construirContexto(chunks);
  if (!contexto.trim()) return "No he encontrado información suficiente.";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODELO_LLM,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `CONSULTA:\n${query}\n\nCONTEXTO:\n${contexto}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI chat ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return (json.choices?.[0]?.message?.content ?? "").trim();
}

export async function generarRespuesta(query: string, chunks: Chunk[], properties: Property[]): Promise<string> {
  return MODE === "live"
    ? generarRespuestaLive(query, chunks)
    : generarRespuestaMock(query, chunks, properties);
}
