import { z } from "zod";
import { provincias } from "@/lib/provincias";

const required = (label: string, max = 120) => z.string().trim().min(1, `Completá ${label}`).max(max, "Es demasiado largo");

/** Same rule as the API: one line, no control characters (tabs and line breaks included). */
const singleLine = /^[^\p{Cc}]*$/u;

/** Who the order is for. A business also names the shop; a personal order ignores any leftover business name. */
const customerSchema = z.discriminatedUnion(
  "cliente",
  [
    z.object({ cliente: z.literal("personal"), comercio: z.string().optional() }),
    z.object({
      cliente: z.literal("comercio"),
      comercio: required("el nombre del comercio").regex(singleLine, "Escribilo en una sola línea"),
    }),
  ],
  { error: "Elegí para quién es el pedido" },
);

const contactShape = {
  nombre: required("tu nombre"),
  telefono: required("un teléfono de contacto", 40),
  comentarios: z.string().trim().max(500).optional(),
};

const deliverySchema = z.discriminatedUnion("zona", [
  z.object({
    zona: z.literal("buenos-aires"),
    ...contactShape,
    localidad: required("la localidad"),
    direccion: required("la dirección", 200),
    /** Punto exacto captado desde un link de Maps o una dirección con puerta; viaja como link en el mensaje. */
    ubicacion: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).optional(),
  }),
  z.object({
    zona: z.literal("otra-provincia"),
    ...contactShape,
    provincia: z.enum(provincias, { error: "Elegí la provincia" }),
    expreso: required("el expreso de tu preferencia", 200),
  }),
]);

export const orderSchema = z.intersection(customerSchema, deliverySchema);

export type OrderForm = z.infer<typeof orderSchema>;
export type CustomerChoice = OrderForm["cliente"];
