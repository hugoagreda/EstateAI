import type { Property } from "@/lib/types";
import { formatearPrecio } from "@/lib/text";

export function PropertyCard({ p }: { p: Property }) {
  const disponible = p.disponibilidad?.toLowerCase() === "disponible";
  return (
    <article className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
      <div className="flex flex-col sm:flex-row">
        {p.imagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.imagen}
            alt={p.titulo}
            className="h-40 w-full object-cover sm:h-auto sm:w-44"
            loading="lazy"
          />
        ) : null}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-medium leading-snug">{p.titulo}</h3>
            <span className="whitespace-nowrap font-mono text-sm font-semibold text-accent">
              {formatearPrecio(p.precio)}
            </span>
          </div>

          <p className="mt-1 text-sm text-text-muted">
            {p.m2} m² · {p.habitaciones} hab · {p.banos} baños · {p.tipo} · {p.zona}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.estado ? <Tag>{p.estado}</Tag> : null}
            {p.extras.map((e) => (
              <Tag key={e}>{e}</Tag>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                disponible ? "text-ok" : "text-text-muted"
              }`}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: disponible ? "var(--ok)" : "var(--text-muted)" }}
              />
              {p.disponibilidad}
            </span>
            <span className="text-text-muted">· Fuente: catálogo</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-border bg-bg px-2 py-0.5 text-xs text-text-muted">
      {children}
    </span>
  );
}
