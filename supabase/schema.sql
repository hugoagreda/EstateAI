-- EstateAI — Supabase schema (run in the SQL editor before `npm run seed`).
-- Requires pgvector. text-embedding-3-small = 1536 dims.

create extension if not exists vector;

create table if not exists estateai_chunks (
  id        text primary key,
  texto     text not null,
  metadata  jsonb not null,
  embedding vector(1536)
);

-- <500 chunks: brute-force cosine is fine, no index needed. If the catalog
-- grows past a few thousand rows, add an HNSW index:
-- create index on estateai_chunks using hnsw (embedding vector_cosine_ops);

-- Retrieval RPC used by src/lib/retrieval.ts (live mode).
create or replace function match_chunks(
  query_embedding vector(1536),
  match_count int default 5
)
returns table (id text, texto text, metadata jsonb, similarity float)
language sql stable
as $$
  select
    c.id,
    c.texto,
    c.metadata,
    1 - (c.embedding <=> query_embedding) as similarity
  from estateai_chunks c
  where c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
