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

export interface CtxRespuesta {
  zona: string | null;
  pediaListado: boolean;
  hayFiltro: boolean;
}

// Small deterministic variation so replies don't read as a fixed template
// (no LLM: a stable index from the query picks a phrasing).
function elegir<T>(opciones: T[], semilla: string): T {
  let h = 0;
  for (let i = 0; i < semilla.length; i++) h = (h * 31 + semilla.charCodeAt(i)) >>> 0;
  return opciones[h % opciones.length];
}

function listar(properties: Property[], ctx: CtxRespuesta, query: string): string {
  const n = properties.length;
  const donde = ctx.zona ? ` en ${ctx.zona}` : "";
  const cabecera =
    n === 1
      ? elegir(
          [`Solo tengo un inmueble${donde} que encaje con lo que buscas:`,
           `De momento hay uno${donde} que cuadra con tu búsqueda:`],
          query,
        )
      : elegir(
          [`Tengo ${n} inmuebles${donde} que encajan con lo que buscas:`,
           `He encontrado ${n}${donde} que cuadran con lo que pides:`,
           `Estos ${n}${donde} encajan con tu búsqueda:`],
          query,
        );
  const lineas = properties
    .map((p) => `• ${p.titulo} — ${formatearPrecio(p.precio)} · ${p.m2} m² · ${p.habitaciones} hab · ${p.disponibilidad}`)
    .join("\n");
  return `${cabecera}\n${lineas}`;
}

export function generarRespuestaMock(
  query: string,
  chunks: Chunk[],
  properties: Property[],
  ctx: CtxRespuesta,
): string {
  const topEsInmueble = chunks[0]?.metadata.categoria === "inmueble";

  // Listings found and they lead → list them cleanly (cards render below).
  if (topEsInmueble && properties.length > 0) {
    return listar(properties, ctx, query);
  }

  // The visitor asked for listings but none match → say so plainly. NEVER dump
  // the neighbourhood description here (that only belongs to zone questions).
  // Only when there was a REAL constraint (zona or a hard filter); a bare "piso"
  // in a non-search question ("¿puedo tener un perro en el piso?") falls through
  // to the sensible no-data reply below, not to "no listings match".
  if (ctx.pediaListado && properties.length === 0 && (ctx.zona != null || ctx.hayFiltro)) {
    const donde = ctx.zona ? ` en ${ctx.zona}` : "";
    return `Ahora mismo no tengo ningún inmueble${donde} que encaje con esos criterios. Si quieres, un agente puede avisarte en cuanto entre algo así, o puedes ajustar la búsqueda.`;
  }

  // Zone / process / FAQ knowledge → surface the most relevant passage, trimmed.
  if (chunks.length > 0) {
    const top = chunks[0];
    return top.texto.length > 600 ? top.texto.slice(0, 600) + "…" : top.texto;
  }

  // Nothing in the data. Sensible, warm redirect + agent offer (a pet policy,
  // for instance, depends on each listing — not a flat "no data").
  return "Eso no está en la información que manejo; según el caso puede depender del inmueble. Si quieres, puedo ponerte en contacto con un agente que te lo confirme. ¿Te ayudo con los pisos, las zonas o el proceso de compra o alquiler?";
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

export async function generarRespuesta(
  query: string,
  chunks: Chunk[],
  properties: Property[],
  ctx: CtxRespuesta,
): Promise<string> {
  return MODE === "live"
    ? generarRespuestaLive(query, chunks)
    : generarRespuestaMock(query, chunks, properties, ctx);
}