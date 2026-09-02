import { normalizar } from "./text";

/* ------------------------------------------------------------------ *
 * Deterministic message classifier. Runs BEFORE retrieval so social  *
 * messages (greetings, "who are you", thanks, gibberish) get a fixed, *
 * honest reply — never an LLM improvisation, never a wrong "no data". *
 * Returns a canned answer to short-circuit, or null to proceed to RAG.*
 * All replies are FIXED templates: no generation, so nothing can be   *
 * invented here. This is also the AI-Act transparency touchpoint.     *
 * ------------------------------------------------------------------ */

export interface Canned {
  answer: string;
}

// Full-message greetings only. Anchored (^…$) so "hola, ¿tenéis pisos?" does NOT
// match and falls through to a real answer — the greeting must be the whole message.
const RE_SALUDO =
  /^(hola|holi|ola|buenas|buenos dias|buenas tardes|buenas noches|hey|ey|saludos)(\s+(que tal|como estas|como va|como andas))?[\s!?.]*$/;
const RE_SALUDO_2 =
  /^(que tal|que tal estas|como estas|como va|como andas|como te va)[\s!?.]*$/;

// "About the bot / help" — specific phrases, so "¿qué pisos puedes enseñarme?"
// (which contains "que" and "puedes") does NOT trigger it.
const RE_META =
  /\b(quien eres|que eres|eres un bot|eres una ia|eres un robot|eres humano|que puedes hacer|que sabes hacer|que haces|para que sirves|como funcionas|que es esto|en que me puedes ayudar|ayuda)\b/;

// Thanks / goodbye as a full message.
const RE_CORTESIA =
  /^(gracias|muchas gracias|mil gracias|ok gracias|vale gracias|perfecto gracias|adios|hasta luego|hasta pronto|chao|nos vemos)[\s!?.]*$/;

// Gibberish: letters-only form has no vowel (real Spanish always has vowels).
function esIninteligible(qNorm: string): boolean {
  const soloLetras = qNorm.replace(/[^a-z]/g, "");
  if (soloLetras.length < 2) return true;          // empty / symbols / single char
  return !/[aeiou]/.test(soloLetras);              // "asdfgh", "jkjk" → true
}

const TPL_SALUDO =
  "¡Hola! Soy el asistente virtual de la agencia. Puedo ayudarte con los pisos disponibles, las zonas y el proceso de compra o alquiler. ¿Qué te gustaría saber?";

const TPL_META =
  "Soy un asistente de IA de la agencia. Respondo únicamente con la información real del catálogo: pisos, zonas y el proceso de compra o alquiler. No doy asesoramiento legal ni financiero. ¿En qué puedo ayudarte?";

const TPL_CORTESIA =
  "¡Un placer! Si necesitas algo más sobre los pisos o el proceso de compra o alquiler, aquí estoy.";

const TPL_REFORMULAR =
  "No te he entendido bien. ¿Puedes reformular la pregunta? Puedo ayudarte con pisos, zonas o el proceso de compra o alquiler.";

// Prompt-injection / manipulation attempts. In mock there's no LLM to hijack,
// but this is OWASP's "Layer 1" input screen and it shields the LIVE pipeline
// too. Patterns are specific (not generic verbs) to avoid false positives on
// real questions. On a hit: neutral redirect (never reveal the guardrail) + log.
const RE_INJECCION =
  /(ignora|olvida|ignore|forget)\b.{0,20}\b(instruccion|instructions|reglas|rules|prompt|anterior|previous|sistema|system)|prompt del sistema|system prompt|tus instrucciones|reveal (your )?(prompt|instructions)|(muestra|dame|cual es|repite).{0,15}(tu |el )?(prompt|system|instruccion)|eres (el )?(admin|administrador|sistema|desarrollador)|soy (el )?(admin|administrador|tu creador)|modo (admin|administrador|desarrollador|developer)|developer mode|act(u|ú)a como|haz de|reenv(i|í)a.{0,20}(correo|email|mail)|env(i|í)a.{0,20}(base de datos|datos|todo).{0,20}(correo|email|mail)|jailbreak|DAN mode/;

const TPL_SEGURIDAD =
  "Solo puedo ayudarte con consultas sobre la agencia: pisos, zonas y el proceso de compra o alquiler. ¿En qué puedo ayudarte?";

/** Classify a raw user message. Returns a canned reply, or null to run RAG. */
export function clasificar(query: string): Canned | null {
  const qNorm = normalizar(query);
  if (!qNorm) return { answer: TPL_REFORMULAR };

  if (RE_INJECCION.test(qNorm)) {
    // Server-side log (the "registro"): visible in Vercel/Node logs, never to the user.
    console.warn("[security] posible intento de inyección:", qNorm.slice(0, 120));
    return { answer: TPL_SEGURIDAD };
  }

  if (RE_SALUDO.test(qNorm) || RE_SALUDO_2.test(qNorm)) return { answer: TPL_SALUDO };
  if (RE_META.test(qNorm)) return { answer: TPL_META };
  if (RE_CORTESIA.test(qNorm)) return { answer: TPL_CORTESIA };
  if (esIninteligible(qNorm)) return { answer: TPL_REFORMULAR };

  return null; // a real domain question → proceed to retrieval
}