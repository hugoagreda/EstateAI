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
  /^(hola|holi|ola|buenas|buenos dias|buenas tardes|buenas noches|hey|ey|saludos)([ ]+(hola|buenas|buenos dias|buenas tardes|buenas noches))?([ ]+(que tal|que tal todo|como estas|como va|como andas|como te va|todo bien|como estamos|como andamos|gente|a todos))?[\s!?.]*$/;
const RE_SALUDO_2 =
  /^(que tal|que tal todo|que tal estas|como estas|como va|como andas|como te va|todo bien|como estamos)[\s!?.]*$/;

// "About the bot / help" — specific phrases, so "¿qué pisos puedes enseñarme?"
// (which contains "que" and "puedes") does NOT trigger it.
const RE_META =
  /\b(quien eres|que eres|eres un bot|eres una ia|eres un robot|eres humano|que puedes hacer|que sabes hacer|que haces|para que sirves|como funcionas|que es esto|en que (me )?puedes ayudar|me puedes ayudar|puedes ayudarme|me ayudas|ayudame|ayudarme|necesito ayuda|ayuda)\b/;

// Thanks / goodbye. Allow trailing filler ("gracias por todo", "muchas gracias
// crack", "ok adios") without turning into a listing search.
const RE_CORTESIA =
  /^(muchas gracias|mil gracias|ok gracias|vale gracias|perfecto gracias|gracias|adios|hasta luego|hasta pronto|chao|chau|nos vemos|hasta la proxima)([ ]+(por todo|a ti|de nada|crack|majo|igualmente|entonces))?[\s!?.]*$/;

// Gibberish: no vowels at all, OR any word-length token that's all consonants
// ("kjsdfh"), OR only a single repeated letter ("aaa", "eee"). Real Spanish words
// of 4+ letters always contain a vowel and aren't one letter repeated.
function esIninteligible(qNorm: string): boolean {
  const soloLetras = qNorm.replace(/[^a-z]/g, "");
  if (soloLetras.length < 2) return true;              // empty / symbols / single char
  if (/^(.)\1+$/.test(soloLetras)) return true;        // "aaa", "eee", "zzz"
  if (!/[aeiou]/.test(soloLetras)) return true;        // "asdfgh", "jkjk"
  for (const t of qNorm.split(/\s+/)) {
    const l = t.replace(/[^a-z]/g, "");
    if (l.length >= 4 && !/[aeiou]/.test(l)) return true; // "kjsdfh askjdfh"
  }
  return false;
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
  // Punctuation-stripped form so "buenos días, qué tal todo" matches greetings.
  const q = qNorm.replace(/[.,!?¿¡;:]/g, " ").replace(/\s+/g, " ").trim();

  if (RE_INJECCION.test(qNorm)) {
    // Server-side log (the "registro"): visible in Vercel/Node logs, never to the user.
    console.warn("[security] posible intento de inyección:", qNorm.slice(0, 120));
    return { answer: TPL_SEGURIDAD };
  }

  if (RE_SALUDO.test(q) || RE_SALUDO_2.test(q)) return { answer: TPL_SALUDO };
  if (RE_META.test(q)) return { answer: TPL_META };
  if (RE_CORTESIA.test(q)) return { answer: TPL_CORTESIA };
  if (esIninteligible(q)) return { answer: TPL_REFORMULAR };

  return null; // a real domain question → proceed to retrieval
}