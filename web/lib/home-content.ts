// Contenido editable de la home. Las fotos son placeholders hasta recibir el material del cliente:
// completar `src` con una URL de Cloudinary o una ruta de /public y la sección la muestra sola.
// Los textos marcados "a confirmar con el cliente" son propuestos, no datos verificados.

export type Project = {
  title: string;
  place: string;
  before: string | null;
  after: string | null;
};

export const projects: Project[] = [
  { title: "Living con ventanal", place: "Ejemplo — reemplazar por proyecto real", before: null, after: null },
  { title: "Dormitorio principal", place: "Ejemplo — reemplazar por proyecto real", before: null, after: null },
  { title: "Comedor con doble barral", place: "Ejemplo — reemplazar por proyecto real", before: null, after: null },
];

export const heroImage: string | null = null;

export type Faq = { question: string; answer: string };

// A confirmar con el cliente antes de publicar.
export const faqs: Faq[] = [
  {
    question: "¿Cómo mido mi ventana?",
    answer:
      "Medí el ancho de la abertura o de la pared donde va la cortina. La cortina suele salir unos centímetros de cada lado para tapar bien la luz: elegí la medida de barral que cubra ese total. Si estás entre dos medidas, conviene la más larga. Ante la duda, escribinos por WhatsApp con la medida y te orientamos.",
  },
  {
    question: "¿Qué medida de barral elijo?",
    answer:
      "Trabajamos medidas de 1.20 a 3.00 m, de a 0.20 m. Para tramos de hasta 1.60 m alcanza con dos soportes; desde 1.80 m los kits incluyen tres soportes para que el barral no ceda en el centro.",
  },
  {
    question: "¿Grosor 22 o 34?",
    answer:
      "Es el grosor del barral. El 34 es el más robusto, pensado para tramos largos o cortinas pesadas; el 22 es más fino y liviano, ideal para ventanas chicas y cortinas livianas. Los soportes y accesorios se piden en el mismo grosor que el barral.",
  },
  {
    question: "¿De qué material son?",
    answer: "Los barrales son de madera y se ofrecen en tres colores: Natural, Caoba y Cedro.",
  },
  {
    question: "¿Qué trae cada kit?",
    answer:
      "El kit simple trae 1 barral con sus soportes y terminales; el doble incluye 2 barrales para cortina y voile. Cada kit se ofrece en los dos grosores y los tres colores, y hay uno para medidas de 1.20 a 1.60 y otro de 1.80 a 3.00.",
  },
  {
    question: "¿Cómo compro y cómo es el envío?",
    answer:
      "En la web no hay precios: armás tu pedido o tocás \"Pedir por WhatsApp\" en la medida que te interesa y te respondemos con la cotización. El envío se coordina con vos: en Buenos Aires directo, al resto del país por el expreso que prefieras.",
  },
];

// A confirmar con el cliente antes de publicar.
export const proConditions: string[] = [
  "Cotización por volumen para decoradores, tapiceros y revendedores.",
  "Pedidos con todas las combinaciones de medida, grosor y color en un solo mensaje.",
  "Envío a todo el país por el expreso de tu preferencia; en Buenos Aires se coordina la entrega.",
];
