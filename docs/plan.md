 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Sección "Recursos" para generar confianza en la home

 Context

 La home ya vende (hero, proyectos, catálogo, profesionales, FAQ), pero falta contenido que reduzca la duda de quien compra un barral por WhatsApp sin ver precios: cómo medir, qué elegir, cómo instalar, cómo se trabaja y qué respaldo tiene el negocio. Decisiones del usuario: incluir guías prácticas, proceso y garantías y testimonios/clientes, presentados como una sección "Recursos" en la home con tarjetas que llevan a páginas de guía (/recursos/[slug], también útiles para SEO). Regla: no se inventan datos (años, cantidad de clientes, garantías, opiniones). Lo que no esté confirmado por el cliente no se muestra.

 Estructura en la home

 Orden: Hero → Proyectos → Catálogo → Recursos → Testimonios (solo si hay) → Profesionales → FAQ.

 1. Recursos (components/home/resources.tsx, server): título "Antes de pedir, todo lo que conviene saber". Una guía destacada grande (Cómo medir tu ventana) + lista de las demás (título, una línea, "Leer guía"), sin la grilla repetida de ícono+título+texto. Debajo, franja "Cómo trabajamos" con los 4 pasos reales del acta: elegís tu pedido → lo enviás por WhatsApp → te cotizamos → coordinamos el envío (Buenos Aires directo o por expreso). Subtexto verificable: "Sin precios en la web: la cotización llega por WhatsApp" y materiales (madera, 3 colores: Natural, Caoba, Cedro).
 2. Testimonios (components/home/testimonials.tsx): renderiza solo si testimonials.length > 0; cada item con nombre, rubro/localidad y cita real. Mientras esté vacío no aparece nada (sin placeholders públicos).
 3. Navegación: agregar { id: "recursos", href: "/#recursos", label: "Recursos", icon: BookOpenIcon } a sectionLinks en web/lib/nav.ts (alimenta el menú burger y el resaltado de sección activa) y a la lista sections del header desktop en app/(public)/layout.tsx.

 Páginas de guía

 - web/lib/guides.ts: guides: { slug, title, summary, updated?, steps|sections }[] con el contenido (tipado). Guías iniciales: cómo-medir-tu-ventana, elegir-grosor-y-medida (22 vs 34, 1.20→3.00, cuándo 2 o 3 soportes: ya en faqs), como-instalar-el-barral (pasos generales), cuidado-de-la-madera. El texto sale de home-content.ts (faqs) y del acta; lo no confirmado se marca en el archivo con // a confirmar con el cliente y se lista en el resumen final.
 - web/app/(public)/recursos/[slug]/page.tsx: generateStaticParams, generateMetadata (title/description/OpenGraph), migas de pan, contenido en max-w-prose, JSON-LD HowTo (medir/instalar) o Article, y cierre con CTA: "¿Dudas con tu medida? Escribinos" → whatsappUrl con mensaje prellenado (nueva buildGuideMessage(title) en lib/whatsapp.ts, con test) más enlace al catálogo. notFound() si el slug no existe.
 - web/app/sitemap.ts: sumar las URLs de las guías.
 - Mobile: tipografía legible, sin desborde, botón WhatsApp ≥44px (mismos patrones ya usados).

 Contenido a pedir al cliente (queda fuera hasta confirmarse)

 Testimonios reales (nombre, rubro, texto, permiso), garantía/cambios, formas de pago, tiempo de entrega habitual, años de trayectoria, fotos de proceso/taller. Se cargan en lib/home-content.ts (testimonials, guarantees) y aparecen solos.

 Archivos

 Nuevos: components/home/resources.tsx, components/home/testimonials.tsx, lib/guides.ts, app/(public)/recursos/[slug]/page.tsx. Modificados: app/(public)/page.tsx, app/(public)/layout.tsx, lib/nav.ts, lib/home-content.ts, lib/whatsapp.ts (+ whatsapp.test.ts), app/sitemap.ts. Reutiliza PhotoSlot, Button, whatsappUrl, tokens brand, clase .anchor-section. Sin librerías ni cambios de backend.

 Verificación

 1. Levantar API (5080) y web (3000).
 2. Home: aparece Recursos entre Catálogo y Profesionales; Testimonios no aparece (lista vacía); el ancla #recursos y el burger/menú mobile resaltan "Recursos".
 3. Abrir cada /recursos/<slug>: contenido correcto, notFound en un slug inexistente, CTA de WhatsApp con mensaje prellenado y sin precios; JSON-LD presente.
 4. Mobile (ventana angosta): sin desborde horizontal, filas/botones ≥44px; desktop sin regresión.
 5. Con un testimonio de prueba en home-content.ts verificar que la sección se muestra y luego revertir.
 6. npx tsc --noEmit, npm run lint, npm test, npm run build, detect.mjs sobre los archivos cambiados.