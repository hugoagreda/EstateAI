// Central config. Everything reads from here so there's one place to flip.

export const MODE: "mock" | "live" =
  (process.env.ESTATEAI_MODE === "live" ? "live" : "mock");

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
export const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const MODELO_LLM = "gpt-4o-mini";
export const MODELO_EMBEDDING = "text-embedding-3-small";

// Retrieval
export const TOP_K = 5; // notebook used 3; 5 gives the card list more to work with
export const MAX_PROPERTIES_IN_ANSWER = 4;

// Rate limiting
export const RATELIMIT_PER_IP_PER_HOUR = num(process.env.RATELIMIT_PER_IP_PER_HOUR, 8);
export const RATELIMIT_GLOBAL_DAILY = num(process.env.RATELIMIT_GLOBAL_DAILY, 500);
export const MAX_INPUT_CHARS = num(process.env.MAX_INPUT_CHARS, 500);

function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
