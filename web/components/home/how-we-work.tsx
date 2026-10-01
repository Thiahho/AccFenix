import Image from "next/image";

const steps = [
  { title: "Elegís tu pedido", text: "Medida, grosor y color de cada barral o kit." },
  { title: "Lo enviás por WhatsApp", text: "Todo el pedido en un solo mensaje." },
  { title: "Te cotizamos", text: "Sin precios en la web: la cotización llega por WhatsApp." },
  { title: "Coordinamos el envío", text: "Buenos Aires directo; al resto del país por expreso." },
];

/** Los cuatro pasos reales de cómo se compra, en la banda azul noche de la portada. */
export function HowWeWork() {
  return (
    <section id="como-trabajamos" className="anchor-section bg-navy text-ivory" aria-labelledby="como-trabajamos-titulo">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-[1fr_2fr] md:gap-16 md:py-24">
        <div className="relative hidden aspect-[3/4] overflow-hidden rounded-t-full rounded-b-sm md:block">
          <Image src="/cortina-1.png" alt="Cortinas con barral de madera en un living" fill sizes="(min-width: 768px) 30vw, 0px" className="object-cover" />
        </div>
        <div className="flex flex-col gap-9">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold tracking-[0.3em] text-brass-light">CÓMO TRABAJAMOS</span>
            <h2 id="como-trabajamos-titulo" className="font-serif text-4xl leading-[1.02] font-medium text-balance sm:text-5xl">
              Del catálogo a tu ventana, en cuatro pasos.
            </h2>
          </div>
          <ol className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4 border-t border-ivory/25 pt-4">
                <span aria-hidden className="font-serif text-3xl leading-none text-brass-light">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex flex-col gap-1">
                  <strong className="font-semibold">{s.title}</strong>
                  <span className="text-sm leading-relaxed text-ivory/75">{s.text}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
