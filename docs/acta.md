**PROPUESTA DE PROYECTO**

Sitio web de catálogo y gestión de redes sociales --- Venta de barrales
para cortinas

**1. Objetivo del proyecto**

Desarrollar un sitio web de catálogo, sin precios visibles al público,
que permita a clientes minoristas y mayoristas armar un pedido con
múltiples productos y variantes, y enviarlo por WhatsApp para su
cotización y confirmación por parte del vendedor. El sistema permite
además cargar y administrar el catálogo de forma flexible, incorporando
nuevas categorías y productos a futuro. El objetivo comercial es ampliar
la base de clientes actual, manteniendo la marca (logo y colores) ya
definida por el cliente.

**2. Alcance --- Sitio Web**

**2.1 Catálogo de productos**

-   Tres catálogos: Barrales, Accesorios y Kits.

-   Barrales: 10 medidas (1.20m a 3.00m, en pasos de 0.20m) × 2 grosores
    (22 / 34) × 3 colores (Natural, Caoba, Cedro).

-   Accesorios: Soporte Bocha, Soporte Doble, Argollas, Terminales y
    Soporte Lateral --- cada uno con grosor (22 / 34) y color (Natural,
    Caoba, Cedro), sin cantidad fija de venta.

-   Kits: combinan un barral con sus accesorios correspondientes, como
    producto propio (foto y descripción propia, independiente del stock
    de barrales/accesorios sueltos):

    -   Medida 1.20 a 1.60 --- versión simple: 2 soportes + 2
        terminales.

    -   Medida 1.20 a 1.60 --- versión doble (2 barrales): 2 soportes +
        4 terminales.

    -   Medida 1.80 a 3.00 --- versión simple: 3 soportes + 3
        terminales.

    -   Medida 1.80 a 3.00 --- versión doble (2 barrales): 3 soportes +
        4 terminales.

    -   Cada Kit disponible en 2 grosores (22 / 34) y 3 colores
        (Natural, Caoba, Cedro).

-   Toggle de disponibilidad (\"disponible\" / \"a pedido\") por
    combinación, editable por el vendedor desde el panel.

-   Precios no visibles al público en ningún caso --- el sistema no
    calcula ni muestra montos.

**2.2 Panel de administración**

-   Sistema de categorías y atributos configurables: el vendedor puede
    crear nuevas categorías de producto y definir qué atributos tiene
    cada una (color, grosor, medida u otros a futuro), no limitado a los
    tres catálogos actuales.

-   Los catálogos de Barrales, Accesorios y Kits se cargan inicialmente
    sobre esta base, quedando disponibles para agregar productos o
    categorías nuevas más adelante.

-   Carga inicial de fotos/video a cargo del desarrollador, con material
    provisto por el cliente.

-   Mantenimiento y actualización del catálogo, a cargo del cliente una
    vez entregado el panel.

-   Umbral de cantidad mayorista editable por el vendedor (valor de
    referencia inicial: 100 unidades).

**2.3 Pedido y carrito**

-   Carrito multi-producto: el comprador agrega distintos productos y
    variantes (barrales, accesorios y/o kits) antes de finalizar.

-   Persistencia en el navegador (localStorage) con expiración
    automática para evitar datos viejos.

-   Al confirmar, se genera un único mensaje de WhatsApp con el detalle
    completo del pedido (productos, variantes y cantidades).

**2.4 Envío**

-   El sistema no calcula costos ni distancias de envío --- la gestión
    del envío la realiza el vendedor por fuera del sistema.

-   El formulario de pedido solicita al comprador indicar su ubicación:

    -   Buenos Aires: localidad y dirección.

    -   Otra provincia: aclaración de la provincia y un campo de texto
        libre para indicar el expreso de su preferencia.

-   Con esos datos, el vendedor se contacta con el comprador y/o el
    expreso para coordinar el envío fuera del sistema.
