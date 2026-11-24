"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { clientIpHeaders } from "@/lib/admin/client-ip";
import { baseUrl } from "@/lib/api";
import { orderSchema, type OrderForm } from "@/lib/order";
import { isPastPickupTime, PICKUP_PAST_MESSAGE } from "@/lib/orders/pickup-time";
import { buildOrderRequest, type OrderLine } from "@/lib/orders/request";
import { interpretOrderResponse, unavailableResult, type SubmitOrderResult } from "@/lib/orders/response";

const linesSchema = z.array(z.object({ variantId: z.number().int().positive(), qty: z.number().int().positive(), addonValueIds: z.array(z.number().int().positive()).max(20).optional() })).min(1);

const TIMEOUT_MS = 10_000;

/**
 * Stores a public order. It runs on the server so the API sees the visitor IP (`X-Client-Ip`, trusted through
 * `X-Trusted-Web-Key`) and rate limits per visitor instead of sharing one quota among every visitor.
 * Only variant ids and quantities travel: the API prices every line itself.
 */
export async function submitOrder(form: OrderForm, lines: OrderLine[]): Promise<SubmitOrderResult> {
  const parsedForm = orderSchema.safeParse(form);
  const parsedLines = linesSchema.safeParse(lines);
  if (!parsedForm.success || !parsedLines.success) return interpretOrderResponse(400, null);
  if (parsedForm.data.entrega === "retiro" && isPastPickupTime(parsedForm.data.horario, new Date())) {
    return { ok: false, reason: "invalid", error: "Revisá los datos marcados.", fieldErrors: { horario: PICKUP_PAST_MESSAGE } };
  }

  try {
    const res = await fetch(`${baseUrl()}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...clientIpHeaders(await headers(), process.env.API_TRUSTED_KEY) },
      body: JSON.stringify(buildOrderRequest(parsedForm.data, parsedLines.data)),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body: unknown = await res.json().catch(() => null);
    return interpretOrderResponse(res.status, body);
  } catch (e) {
    console.error("Order could not be stored", e);
    return unavailableResult();
  }
}
