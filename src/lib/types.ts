// Shared types for EstateAI. Kept minimal on purpose.

export type Categoria = "inmueble" | "proceso" | "barrio" | "faq";

export interface ChunkMetadata {
  categoria: Categoria;
  fuente: string;
  // inmueble-only fields (present when categoria === "inmueble")
  id_inmueble?: number;
  zona?: string;
  precio?: number;
  habitaciones?: number;
  banos?: number;
  m2?: number;
  tipo?: string;
  estado?: string;
  disponibilidad?: string;
  titulo?: string;
  extras?: string[];
  descripcion?: string;
  enlace?: string;
  // non-inmueble
  chunk_idx?: number;
}

export interface Chunk {
  id: string;
  texto: string;
  metadata: ChunkMetadata;
}

/** A property surfaced in the answer, shaped for <PropertyCard/>. */
export interface Property {
  id: number;
  titulo: string;
  zona: string;
  precio: number;
  m2: number;
  habitaciones: number;
  banos: number;
  tipo: string;
  estado: string;
  disponibilidad: string;
  extras: string[];
  descripcion: string;
  imagen: string;
}

/** One retrieved source, shown in the "Ver fuentes utilizadas" panel.
 *  Provenance ONLY: document name + type. Never the retrieved content, so the
 *  panel can't leak catalogue rows or (for other sectors) sensitive passages. */
export interface SourceRef {
  fuente: string;
  categoria: Categoria;
}

export interface ChatResponse {
  answer: string;
  properties: Property[];
  sources: SourceRef[];
}

export interface ChatError {
  error: string;
  code: "rate_limit_ip" | "rate_limit_global" | "input_too_long" | "bad_request" | "server_error";
}