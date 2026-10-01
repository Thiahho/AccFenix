import { BeforeAfter } from "@/components/home/before-after";
import { projects } from "@/lib/home-content";

export function ProjectsGallery() {
  return (
    <section id="proyectos" className="anchor-section mx-auto max-w-6xl px-4 py-12 md:py-16" aria-labelledby="proyectos-titulo">
      <span className="eyebrow text-brass">Proyectos</span>
      <h2 id="proyectos-titulo" className="title-serif mt-3 max-w-xl text-4xl sm:text-5xl">
        Así cambia un ambiente con el barral correcto
      </h2>
      <ul className="mt-10 grid gap-x-6 gap-y-10 md:grid-cols-3">
        {projects.map((p) => (
          <li key={p.title}>
            <BeforeAfter title={p.title} before={p.before} after={p.after} />
            <p className="mt-3 font-medium">{p.title}</p>
            <p className="text-sm text-muted-foreground">{p.place}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
