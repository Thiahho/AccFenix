// zod/mini keeps this schema tree-shakable: it ships in the client bundle of /pedido through the form resolver.
import * as z from "zod/mini";
import { provincias } from "@/lib/provincias";

const required = (label: string, max = 120) =>
  z.string().check(z.trim(), z.minLength(1, `Completá ${label}`), z.maxLength(max, "Es demasiado largo"));

/**
 * Who the order is for. Neither a phone nor a business name is asked: the order goes out from the customer's own
 * WhatsApp, so the distributor already has the number, and a business simply gives its name as the contact name.
 */
const customerSchema = z.object({
  cliente: z.enum(["personal", "comercio"], { error: "Elegí para quién es el pedido" }),
});

const contactShape = {
  nombre: required("tu nombre"),
  comentarios: z.optional(z.string().check(z.trim(), z.maxLength(500, "Es demasiado largo"))),
};

const deliverySchema = z.discriminatedUnion("zona", [
  z.object({
    zona: z.literal("buenos-aires"),
    ...contactShape,
    localidad: required("la localidad"),
    direccion: required("la dirección", 200),
    /** Punto exacto captado desde un link de Maps o una dirección con puerta; viaja como link en el mensaje. */
    ubicacion: z.optional(
      z.object({ lat: z.number().check(z.gte(-90), z.lte(90)), lng: z.number().check(z.gte(-180), z.lte(180)) }),
    ),
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
