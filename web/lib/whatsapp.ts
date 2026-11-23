/** Consulta directa por un café puntual (botón "Pedir por WhatsApp" de la carta). */
export function buildVariantMessage(productName: string, valuesLabel: string): string {
  return ["¡Hola! Quiero pedir:", `• ${productName} — ${valuesLabel}`, "", "¿Me confirman el total y el horario?"].join("\n");
}

/** Message the customer sends after paying, with the payment receipt attached in the chat. */
export function buildComprobanteMessage(orderNumber: number): string {
  return [`¡Hola! Te envío el comprobante del pago del pedido #${orderNumber}.`].join("\n");
}

export function whatsappUrl(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
