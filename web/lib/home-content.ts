// Editable home copy for ColdCup (demo). Datos sin confirmar van como "*****" hasta que el cliente los entregue.

/** Placeholder para datos que todavía no entregó el cliente (dirección, horario, alias, costo y mínimo de envío). */
export const PENDING = "*****";

export const heroImage = {
  src: "/eggy-hero.png",
  alt: "Vaso de café frío con hielo",
};

/** Handwritten phrases taken from the printed ColdCup menu. */
export const accentPhrases = {
  hero: "Good Coffee, Cooler Days",
  board: "Más café frío, por favor",
};

export type Step = { title: string; text: string };

export const steps: Step[] = [
  { title: "Elegís", text: "Armá tu pedido en la web: bebida, tamaño y extras. El total se calcula al momento." },
  { title: "Pagás", text: "Pagás con Mercado Pago. Cuando el pago se aprueba, tu pedido queda registrado." },
  { title: "Retirás o recibís", text: "Pasás a buscarlo por el local o te lo llevamos a Moreno. El pago en efectivo se hace al retirar." },
];

/** Where the "Cómo trabajamos" journey ends. */
export const journeyGoal: Step = { title: "Tu café, listo", text: "Frío y en el momento que lo pediste." };

export type Faq = { question: string; answer: string };

export const faqs: Faq[] = [
  {
    question: "¿Cómo pago?",
    answer:
      "Pagás con Mercado Pago desde la web. Cuando se aprueba el pago, te mandamos el comprobante por WhatsApp. Si preferís pagar en efectivo, es al retirar el café.",
  },
  {
    question: "¿A dónde envían?",
    answer: `Hacemos envíos solo en Moreno. El costo de envío es ${PENDING} y el pedido mínimo es ${PENDING}.`,
  },
  {
    question: "¿Puedo pasar a buscar el pedido?",
    answer: `Sí. Retirás en el local, en ${PENDING}, en el horario de ${PENDING}.`,
  },
  {
    question: "¿Cuánto cuestan los extras?",
    answer: "Leche de almendras suma $1.000 y leche deslactosada suma $500. El extra tiene el mismo precio sin importar el tamaño.",
  },
  {
    question: "¿Los precios de la web están actualizados?",
    answer:
      "Sí, los cargamos nosotros y los actualizamos cuando cambian. Si un producto no tiene precio, te lo pasamos por WhatsApp.",
  },
];
