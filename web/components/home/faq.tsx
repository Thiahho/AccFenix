import { FaqItem } from "@/components/home/faq-item";
import { JsonLd } from "@/components/seo/json-ld";
import { faqs } from "@/lib/home-content";

export function Faq() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <section id="preguntas" className="anchor-section bg-ivory" aria-labelledby="faq-titulo">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8 lg:px-8 lg:py-20">
        <div>
          <p className="poster-hand text-2xl text-caramel-deep">Preguntas</p>
          <h2 id="faq-titulo" className="poster-display poster-section-title mt-2">
            Preguntas frecuentes
          </h2>
        </div>
        <div className="divide-y divide-border rounded-2xl border border-border bg-card px-5 sm:px-6">
          {faqs.map((f) => (
            <FaqItem key={f.question} question={f.question} answer={f.answer} />
          ))}
        </div>
      </div>
      <JsonLd data={jsonLd} />
    </section>
  );
}
