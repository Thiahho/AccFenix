const block = "bg-muted motion-safe:animate-pulse";

/** Mirrors the catalog page: the page head and the ruled product rows. */
export default function Loading() {
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">Cargando…</span>
      <div aria-hidden>
        <div className="poster-ink h-48 border-b border-border" />
        <ul className="grid lg:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="min-h-32 border-b border-border px-4 py-5 sm:px-6 lg:px-8 lg:odd:border-r">
              <div className={`${block} h-8 w-2/3`} />
              <div className={`${block} mt-3 h-4 w-full`} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
