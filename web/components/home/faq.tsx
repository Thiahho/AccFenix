import { FaqItem } from "@/components/home/faq-item";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
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
    <section id="preguntas" className="anchor-section mx-auto max-w-3xl px-4 py-12 md:py-16" aria-labelledby="faq-titulo">
      <Reveal>
        <span className="eyebrow text-caramel-deep">Preguntas</span>
        <h2 id="faq-titulo" className="title-display mt-3 text-4xl sm:text-5xl">
          Preguntas frecuentes
        </h2>
      </Reveal>
      <Stagger stagger={0.06} className="mt-8 divide-y border-y">
        {faqs.map((f) => (
          <StaggerItem key={f.question} y={10}>
            <FaqItem question={f.question} answer={f.answer} />
          </StaggerItem>
        ))}
      </Stagger>
      <JsonLd data={jsonLd} />
    </section>
  );
}
