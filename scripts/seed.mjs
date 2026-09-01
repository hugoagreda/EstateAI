// Embed data/chunks.json and load them into Supabase pgvector.
// RUN THIS ONLINE (needs OpenAI + Supabase). Not needed for mock mode.
//   1) Fill .env (OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
//   2) Run supabase/schema.sql in the Supabase SQL editor first
//   3) node scripts/seed.mjs
//
// Uses fetch only — no SDKs.

import { readFileSync } from "node:fs";
import { join } from "node:path";

const {
  OPENAI_API_KEY,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

const MODELO_EMBEDDING = "text-embedding-3-small";
const BATCH = 64;

if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Faltan variables: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.");
  console.error("   Cárgalas en el entorno antes de ejecutar (o usa dotenv).");
  process.exit(1);
}

const chunks = JSON.parse(readFileSync(join(process.cwd(), "data", "chunks.json"), "utf-8"));

async function embedBatch(texts) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: MODELO_EMBEDDING, input: texts }),
  });
  if (!res.ok) throw new Error(`OpenAI embeddings ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data.map((d) => d.embedding);
}

async function upsert(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/estateai_chunks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`Supabase insert ${res.status}: ${await res.text()}`);
}

async function main() {
  console.log(`Embedding ${chunks.length} chunks con ${MODELO_EMBEDDING}…`);
  let done = 0;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const slice = chunks.slice(i, i + BATCH);
    const embeddings = await embedBatch(slice.map((c) => c.texto));
    const rows = slice.map((c, j) => ({
      id: c.id,
      texto: c.texto,
      metadata: c.metadata,
      embedding: embeddings[j],
    }));
    await upsert(rows);
    done += rows.length;
    console.log(`  · ${done}/${chunks.length}`);
  }
  console.log("✅ Seed completado. Cambia ESTATEAI_MODE=live para usar el RAG real.");
}

main().catch((e) => { console.error(e); process.exit(1); });
