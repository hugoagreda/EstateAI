import type { Chunk } from "./types";
// data/chunks.json is generated from doc/ by scripts/build-chunks.mjs.
// It ships in the repo so mock mode needs zero build step.
import raw from "../../data/chunks.json";

export const CHUNKS: Chunk[] = raw as unknown as Chunk[];

export const ZONAS: string[] = Array.from(
  new Set(
    CHUNKS.filter((c) => c.metadata.categoria === "inmueble" && c.metadata.zona)
      .map((c) => c.metadata.zona as string),
  ),
).sort();
