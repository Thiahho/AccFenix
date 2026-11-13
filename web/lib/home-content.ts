// Editable home copy. Texts marked "a confirmar con el cliente" are proposals, not verified business data.

export const heroImage = {
  src: "/eggy-hero.png",
  alt: "Huevo blanco con el logo de Eggy apoyado en una maple roja",
};

export type Step = { title: string; text: string };

export const steps: Step[] = [
  { title: "Pedís", text: "Por WhatsApp o armando tu pedido acá en la web, por maple, medio cajón o cajón." },
  { title: "Confirmamos", text: "Te respondemos con el total, el día y la franja de entrega." },
  { title: "Entregamos", text: "Llevamos el pedido con nuestro camión propio, cuidado para que llegue entero." },
];

/** Where the "Cómo trabajamos" journey ends. */
export const journeyGoal: Step = { title: "Tus huevos, en tu puerta", text: "El día y en la franja que acordamos, listos para usar." };

export type Faq = { question: string; answer: string };

// A confirmar con el cliente: zones, payment methods and wholesale rules are proposals.
export const faqs: Faq[] = [
  {
    question: "¿Qué es un maple?",
    answer: "Es la bandeja de cartón donde vienen los huevos: un maple trae 30 huevos.",
  },
  {
    question: "¿Cuántos huevos trae un cajón y un medio cajón?",
    answer: "El cajón trae 12 maples, es decir 360 huevos. El medio cajón trae 6 maples: 180 huevos.",
  },
  {
    question: "¿A qué zonas entregan?",
    answer:
      "Entregamos con camión propio en nuestra zona de reparto. Al hacer el pedido te confirmamos si llegamos a tu dirección y qué día pasamos.",
  },
  {
    question: "¿Venden por mayor?",
    answer:
      "Sí. Trabajamos con comercios, almacenes, verdulerías y restaurantes. Los pedidos grandes se cobran a precio mayorista: el mínimo figura en la sección Mayoristas.",
  },
  {
    question: "¿Cómo se paga?",
    answer: "Podés pagar en efectivo o por transferencia al recibir el pedido. Si necesitás otra forma de pago, consultanos por WhatsApp.",
  },
  {
    question: "¿Los precios de la web están actualizados?",
    answer:
      "Sí, los cargamos nosotros y los actualizamos cuando cambian. Si un producto dice \"Consultar\", te pasamos el precio por WhatsApp.",
  },
];

// A confirmar con el cliente antes de publicar.
export const wholesaleConditions: string[] = [
  "Precio mayorista para comercios, almacenes, verdulerías y restaurantes.",
  "Reparto programado con camión propio, en el día y la franja que te queden cómodos.",
  "Un solo contacto por WhatsApp para pedidos, cambios y facturación.",
];
