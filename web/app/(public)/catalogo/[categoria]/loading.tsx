const block = "rounded-md bg-muted motion-safe:animate-pulse";

/** Mirrors the catalog page: breadcrumb, title and the product grid. */
export default function Loading() {
  return (
    <div aria-busy="true" className="mx-auto max-w-6xl px-4 py-10">
      <span className="sr-only" role="status">Cargando…</span>
      <div aria-hidden>
        <div className={`${block} h-4 w-40`} />
        <div className={`${block} mt-6 h-4 w-20`} />
        <div className={`${block} mt-4 h-10 w-64`} />
        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-8 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="flex min-h-24 items-center gap-4 sm:block">
              <div className={`${block} aspect-square w-32 shrink-0 rounded-lg sm:w-full`} />
              <div className="min-w-0 flex-1">
                <div className={`${block} h-5 w-2/3 sm:mt-3`} />
                <div className={`${block} mt-2 h-4 w-full`} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
