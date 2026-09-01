---
# ⚠️ LIKELY-ADJUST: these frontmatter keys must match your portfolio's zod schema
# (lib/projects.ts). Rename/complete to whatever the parser validates, or EstateAI
# will be silently skipped — that's the known bug you flagged. Add the zod .catch
# with error detail so a missing field is visible instead of swallowed.
title: "EstateAI"
slug: "estateai"
tagline: "Chatbot inmobiliario que responde solo con los datos reales de tu agencia."
stack: ["Next.js", "TypeScript", "Tailwind v4", "Supabase pgvector", "OpenAI"]
tags: ["RAG", "inmobiliario", "IA", "anti-alucinación"]
status: "en desarrollo"
demo: "https://estateai.hugoagreda.dev"
repo: "https://github.com/hugoagreda/EstateAI"
featured: true
---

## Problema

Las inmobiliarias que ponen un chatbot genérico en su web se arriesgan a que
invente datos: precios, características o disponibilidad que no existen. En un
sector donde un dato equivocado tiene consecuencias, un asistente que
"rellena huecos" es un problema, no una ayuda.

## Idea

Un chatbot que responde **anclado exclusivamente a los datos reales de la
agencia** (catálogo, barrios, proceso de compra/alquiler, FAQs) y que dice
"no lo sé" cuando la información no está. La fiabilidad es el producto: el
visitante ve de dónde sale cada respuesta.

## En qué consiste

Pipeline RAG sobre cuatro fuentes reales. Cada piso, FAQ y barrio se convierte
en un chunk; el proceso inmobiliario se trocea por secciones. Los chunks se
indexan con `text-embedding-3-small` en Supabase pgvector y las preguntas se
responden con `gpt-4o-mini` bajo un prompt anti-alucinación que prohíbe
inventar o completar datos ausentes. La demo muestra las respuestas como
fichas de propiedad estructuradas y deja ver las fuentes utilizadas en cada
respuesta.

---

## Desarrollo

Dos modos, controlados por `ESTATEAI_MODE`:

- **`mock`** (por defecto): 100% offline. Retrieval léxico sobre
  `data/chunks.json` + respuesta templada. Sin OpenAI, sin Supabase, sin red.
  Ideal para desarrollar la UI o trabajar sin conexión.
- **`live`**: RAG real. Embeddings OpenAI + Supabase pgvector + `gpt-4o-mini`.

```bash
npm install
npm run dev        # arranca en mock, sin secretos
```

### Pasar a modo real (online)

1. Crea un proyecto Supabase y ejecuta `supabase/schema.sql` (habilita pgvector
   y crea la función `match_chunks`).
2. Copia `.env.example` a `.env` y rellena `OPENAI_API_KEY`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`.
3. Genera embeddings y carga la BD: `npm run seed`.
4. Pon `ESTATEAI_MODE=live` y reinicia.

### Regenerar chunks desde `doc/`

```bash
npm run build:chunks   # reconstruye data/chunks.json (Node puro, sin red)
```

### Arquitectura

```
doc/            fuentes reales (pisos.csv, barrios, operaciones, faqs)
data/chunks.json   chunks pre-generados (se versiona; mock lo usa directo)
scripts/        build-chunks.mjs (regenerar) · seed.mjs (embeddings→Supabase)
supabase/       schema.sql (tabla + match_chunks RPC)
src/lib/        config · chunks · text · retrieval · generate · rag · ratelimit
src/app/api/chat  POST /chat (validación + rate limit)
src/components/ Chat · PropertyCard · Sources · SuggestedChips · Layout
```

### Notas honestas

- El anti-alucinación **reduce** el riesgo de invención; no lo elimina. El
  encuadre correcto es "responde anclado a tus datos y dice *no lo sé*", no
  "cero alucinaciones".
- En modo mock, la respuesta la compone una plantilla a partir de los chunks
  recuperados (no hay LLM). Es honesta: solo usa datos reales del catálogo.
