import { ChevronDownIcon } from "lucide-react";
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
      <span className="eyebrow text-brass">Preguntas</span>
      <h2 id="faq-titulo" className="title-serif mt-3 text-4xl sm:text-5xl">
        Preguntas frecuentes
      </h2>
      <div className="mt-8 divide-y border-y">
        {faqs.map((f) => (
          <details key={f.question} className="group py-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-4 font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              {f.question}
              <ChevronDownIcon aria-hidden className="size-5 shrink-0 text-brass transition-transform group-open:rotate-180" />
            </summary>
            <p className="max-w-[65ch] pb-4 text-muted-foreground text-pretty">{f.answer}</p>
          </details>
        ))}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </section>
  );
}
