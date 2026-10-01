import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Ingresar al panel", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expirada?: string }> }) {
  const { expirada } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center bg-brand-soft px-4">
      <div className="w-full max-w-sm rounded-xl border bg-background p-8 shadow-sm">
        <p className="text-sm font-medium text-brand">{site.name}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Panel de administración</h1>
        {expirada && <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">Tu sesión expiró. Ingresá de nuevo.</p>}
        <LoginForm />
      </div>
    </main>
  );
}
