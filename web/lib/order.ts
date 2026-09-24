import { z } from "zod";
import { provincias } from "@/lib/provincias";

const required = (label: string, max = 120) => z.string().trim().min(1, `Completá ${label}`).max(max, "Es demasiado largo");

export const orderSchema = z.discriminatedUnion("zona", [
  z.object({
    zona: z.literal("buenos-aires"),
    nombre: required("tu nombre"),
    telefono: required("un teléfono de contacto", 40),
    localidad: required("la localidad"),
    direccion: required("la dirección", 200),
    comentarios: z.string().trim().max(500).optional(),
  }),
  z.object({
    zona: z.literal("otra-provincia"),
    nombre: required("tu nombre"),
    telefono: required("un teléfono de contacto", 40),
    provincia: z.enum(provincias, { error: "Elegí la provincia" }),
    expreso: required("el expreso de tu preferencia", 200),
    comentarios: z.string().trim().max(500).optional(),
  }),
]);

export type OrderForm = z.infer<typeof orderSchema>;
