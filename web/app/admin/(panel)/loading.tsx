const block = "rounded-md bg-muted motion-safe:animate-pulse";

/** Shown inside the panel layout (sidebar stays): a page title, a toolbar and a table of rows. */
export default function Loading() {
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">Cargando…</span>
      <div aria-hidden>
        <div className="flex items-center justify-between gap-4">
          <div className={`${block} h-8 w-48`} />
          <div className={`${block} h-9 w-32`} />
        </div>
        <div className="mt-6 space-y-2 rounded-lg border bg-background p-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className={`${block} h-10 w-full`} />
          ))}
        </div>
      </div>
    </div>
  );
}
