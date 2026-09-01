// Regenerate data/chunks.json from doc/. Pure Node, no deps, works offline.
// Mirrors the chunking in chatbot_inmobiliario_rag_openai.ipynb exactly:
//   piso = 1 chunk, faq = 1 chunk, barrio = 1 chunk, operaciones by numbered section.
// Run: npm run build:chunks

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DOC = join(process.cwd(), "doc");
const OUT = join(process.cwd(), "data", "chunks.json");

// --- tiny CSV parser (handles quoted fields with commas / CRLF) ---
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* ignore */ }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""));
}

function toInt(v) { const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : 0; }

const chunks = [];

// PISOS
{
  const rows = parseCSV(readFileSync(join(DOC, "pisos.csv"), "utf-8"));
  const header = rows[0];
  const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const g = (k) => (row[idx[k]] ?? "").trim();
    const id = toInt(g("id"));
    const texto =
      `ID: ${g("id")} | Título: ${g("titulo")} | Zona: ${g("zona")} | ` +
      `Precio: ${g("precio")} EUR | m2: ${g("m2")} | Habitaciones: ${g("habitaciones")} | ` +
      `Baños: ${g("banos")} | Tipo: ${g("tipo")} | Estado: ${g("estado")} | ` +
      `Extras: ${g("extras")} | Disponibilidad: ${g("disponibilidad")} | Descripción: ${g("descripcion")}`;
    chunks.push({
      id: `piso_${id}`,
      texto,
      metadata: {
        categoria: "inmueble", fuente: "pisos.csv", id_inmueble: id,
        zona: g("zona"), precio: toInt(g("precio")), habitaciones: toInt(g("habitaciones")),
        banos: toInt(g("banos")), m2: toInt(g("m2")), tipo: g("tipo"), estado: g("estado"),
        disponibilidad: g("disponibilidad"), titulo: g("titulo"),
        extras: g("extras").split("|").filter(Boolean), descripcion: g("descripcion"), enlace: g("enlace"),
      },
    });
  }
}

// OPERACIONES — split on numbered sections "\n\d+."
{
  const texto = readFileSync(join(DOC, "operaciones_inmobiliarias.txt"), "utf-8").trim();
  const secciones = texto.split(/(?=\n\d+\.)/);
  let i = 0;
  for (const s of secciones) {
    const sec = s.trim();
    if (!sec) continue;
    i++;
    chunks.push({ id: `oper_${i}`, texto: sec, metadata: { categoria: "proceso", fuente: "operaciones_inmobiliarias.txt", chunk_idx: i } });
  }
}

// BARRIOS — 1 block = 1 chunk
{
  const texto = readFileSync(join(DOC, "barrios.txt"), "utf-8").trim();
  const bloques = texto.split(/\n\s*\n/);
  let i = 0;
  for (const b of bloques) {
    const bloque = b.trim();
    if (!bloque) continue;
    i++;
    chunks.push({ id: `barrio_${i}`, texto: bloque, metadata: { categoria: "barrio", fuente: "barrios.txt", chunk_idx: i, zona: bloque.split(":")[0].trim() } });
  }
}

// FAQS — 1 block = 1 chunk
{
  const texto = readFileSync(join(DOC, "faqs.txt"), "utf-8").trim();
  const bloques = texto.split(/\n\s*\n/);
  let i = 0;
  for (const b of bloques) {
    const bloque = b.trim();
    if (!bloque) continue;
    i++;
    chunks.push({ id: `faq_${i}`, texto: bloque, metadata: { categoria: "faq", fuente: "faqs.txt", chunk_idx: i } });
  }
}

writeFileSync(OUT, JSON.stringify(chunks, null, 2), "utf-8");

const counts = chunks.reduce((a, c) => ((a[c.metadata.categoria] = (a[c.metadata.categoria] ?? 0) + 1), a), {});
console.log(`✅ ${chunks.length} chunks →`, OUT);
console.log(counts);
