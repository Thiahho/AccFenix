import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "accfenix_admin";

const apiUrl = () => process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5080";

export async function setSession(token: string, expiresAt: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export type ApiProblem = { title?: string; detail?: string; errors?: Record<string, string[]> };

export class AdminApiError extends Error {
  constructor(public status: number, public problem: ApiProblem) {
    super(problemMessage(problem, status));
  }
}

export function problemMessage(problem: ApiProblem, status: number) {
  const fieldErrors = problem.errors ? Object.values(problem.errors).flat() : [];
  return fieldErrors[0] ?? problem.detail ?? problem.title ?? `Error ${status}`;
}

/** Llama a la API admin con el JWT de la cookie. Si no hay sesión o expiró, redirige al login. */
export async function adminFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect("/admin/login");

  const res = await fetch(`${apiUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init.headers, Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) redirect("/admin/login?expirada=1");
  if (!res.ok) {
    const problem = (await res.json().catch(() => ({}))) as ApiProblem;
    throw new AdminApiError(res.status, problem);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function login(email: string, password: string) {
  const res = await fetch(`${apiUrl()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  if (!res.ok) {
    const problem = (await res.json().catch(() => ({}))) as ApiProblem;
    return { ok: false as const, error: res.status === 429 ? "Demasiados intentos. Esperá unos minutos." : problemMessage(problem, res.status) };
  }
  const { token, expiresAt } = (await res.json()) as { token: string; expiresAt: string };
  await setSession(token, expiresAt);
  return { ok: true as const };
}
