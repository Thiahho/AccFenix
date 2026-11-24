// zod/mini keeps this schema tree-shakable: it ships in the client bundle of /pedido through the form resolver.
import * as z from "zod/mini";
import { isPickupTime } from "@/lib/orders/pickup-time";
import { isValidPhone, PHONE_MESSAGE } from "@/lib/phone";

const required = (label: string, max = 120) =>
  z.string().check(z.trim(), z.minLength(1, `Completá ${label}`), z.maxLength(max, "Es demasiado largo"));

/**
 * The customer data of an order. The phone is required so the shop can coordinate orders paid online, which never
 * pass through WhatsApp. ColdCup takes orders from Moreno only, either for delivery (address required) or for pickup.
 */
export const orderSchema = z
  .object({
    nombre: required("tu nombre"),
    telefono: z.string({ error: PHONE_MESSAGE }).check(z.trim(), z.refine(isValidPhone, { message: PHONE_MESSAGE })),
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
    z.refine((o) => o.entrega !== "retiro" || o.horario.trim() === "" || isPickupTime(o.horario), {
      message: "Elegí una hora válida",
      path: ["horario"],
    }),
  );

/** `cliente` is the removed customer choice: a tab opened before the change may still send it, and it is ignored. */
export type OrderForm = z.infer<typeof orderSchema> & { cliente?: unknown };
export type Fulfillment = OrderForm["entrega"];
