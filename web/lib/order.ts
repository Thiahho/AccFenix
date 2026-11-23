// zod/mini keeps this schema tree-shakable: it ships in the client bundle of /pedido through the form resolver.
import * as z from "zod/mini";

const required = (label: string, max = 120) =>
  z.string().check(z.trim(), z.minLength(1, `Completá ${label}`), z.maxLength(max, "Es demasiado largo"));

/**
 * Who the order is for. No phone is asked: the customer sends the order from their own WhatsApp.
 * ColdCup takes orders from Moreno only, either for delivery (address required) or for pickup at the shop.
 */
export const orderSchema = z
  .object({
    cliente: z.enum(["personal", "comercio"], { error: "Elegí para quién es el pedido" }),
    nombre: required("tu nombre"),
    entrega: z.enum(["envio", "retiro"], { error: "Elegí envío o retiro" }),
    direccion: z.optional(z.string().check(z.trim(), z.maxLength(200, "Es demasiado largo"))),
    horario: required("el horario", 60),
    comentarios: z.optional(z.string().check(z.trim(), z.maxLength(500, "Es demasiado largo"))),
  })
  .check(
    z.refine((o) => o.entrega !== "envio" || (o.direccion ?? "").trim().length > 0, {
      message: "Completá la dirección",
      path: ["direccion"],
    }),
  );

export type OrderForm = z.infer<typeof orderSchema>;
export type CustomerChoice = OrderForm["cliente"];
export type Fulfillment = OrderForm["entrega"];
