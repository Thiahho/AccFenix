/** IP del visitante según las cabeceras que agrega el proxy del hosting (Vercel, nginx). */
export function clientIp(headers: Headers): string | null {
  const ip = headers.get("x-real-ip")?.trim() || headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip || null;
}

/**
 * Cabeceras con las que la web le informa a la API la IP del visitante, para que el límite de intentos de
 * login sea por visitante. La API solo las acepta con la clave compartida (API_TRUSTED_KEY = TrustedWeb__Key).
 */
export function clientIpHeaders(headers: Headers, trustedKey: string | undefined): Record<string, string> {
  const ip = clientIp(headers);
  return trustedKey && ip ? { "X-Client-Ip": ip, "X-Trusted-Web-Key": trustedKey } : {};
}
