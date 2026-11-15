const block = "rounded-md bg-muted motion-safe:animate-pulse";

/** Mirrors the product page: gallery on the left, name, description and option groups on the right. */
export default function Loading() {
  return (
    <div aria-busy="true" className="mx-auto max-w-6xl px-4 py-10">
      <span className="sr-only" role="status">Cargando…</span>
      <div aria-hidden className="grid gap-8 md:grid-cols-2 md:gap-12">
        <div>
          <div className={`${block} aspect-square w-full rounded-lg`} />
          <div className="mt-3 grid grid-cols-5 gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={`${block} aspect-square`} />
            ))}
          </div>
        </div>
        <div>
          <div className={`${block} h-4 w-24`} />
          <div className={`${block} mt-4 h-10 w-3/4`} />
          <div className={`${block} mt-4 h-4 w-full`} />
          <div className={`${block} mt-2 h-4 w-2/3`} />
          <div className="mt-8 space-y-6">
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i}>
                <div className={`${block} h-4 w-20`} />
                <div className="mt-2 flex gap-2">
                  {Array.from({ length: 4 }, (_, j) => (
                    <div key={j} className={`${block} h-10 w-16`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className={`${block} mt-8 h-12 w-full`} />
        </div>
      </div>
    </div>
  );
}
