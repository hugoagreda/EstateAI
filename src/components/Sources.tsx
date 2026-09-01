"use client";

import { useState } from "react";
import type { SourceRef } from "@/lib/types";

const LABEL: Record<string, string> = {
  inmueble: "Catálogo",
  barrio: "Barrios y zonas",
  proceso: "Proceso inmobiliario",
  faq: "Preguntas frecuentes",
};

export function Sources({
  sources,
}: {
  sources: SourceRef[];
}) {
  const [open, setOpen] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex items-center gap-2 text-[13px] font-medium text-text-muted transition-colors hover:text-accent"
      >
        <span
          className={`transition-transform ${
            open ? "rotate-90" : ""
          }`}
        >
          ›
        </span>

        Ver fuentes utilizadas ({sources.length})
      </button>

      {open && (
        <ul className="mt-3 space-y-3 border-l-2 border-accent-soft pl-4">
          {sources.map((source, index) => (
            <li key={index}>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                {LABEL[source.categoria] ?? source.categoria}
              </div>

              {source.zona && (
                <div className="mt-0.5 text-[11px] text-text-muted">
                  {source.zona}
                </div>
              )}

              <p className="mt-1 text-[12px] leading-5 text-text-muted">
                {source.fragmento}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}