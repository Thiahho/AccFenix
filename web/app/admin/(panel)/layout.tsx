import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, LogOutIcon } from "lucide-react";
import { logoutAction } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: { default: "Panel", template: `%s · Panel ${site.name}` }, robots: { index: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-muted/40 md:grid md:grid-cols-[220px_1fr]">
      <aside className="sticky top-0 z-30 flex flex-col border-b bg-background md:z-auto md:h-dvh md:border-r md:border-b-0">
        <div className="flex h-14 items-center gap-2 px-4 font-semibold">
          <span aria-hidden className="grid size-7 place-items-center rounded-md bg-brand text-xs font-bold text-brand-foreground">
            {site.name.charAt(0)}
          </span>
          Panel {site.name}
          {/* Mobile only: compact icon actions in the brand row. */}
          <div className="-mr-2 ml-auto flex gap-1 md:hidden">
            <Button asChild variant="ghost" size="icon">
              <Link href="/" aria-label="Volver al sitio">
                <ArrowLeftIcon />
              </Link>
            </Button>
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="icon" aria-label="Salir">
                <LogOutIcon />
              </Button>
            </form>
          </div>
        </div>
        <AdminNav />
        <div className="mt-auto hidden space-y-1 p-3 md:block">
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href="/">
              <ArrowLeftIcon /> Volver al sitio
            </Link>
          </Button>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" className="w-full justify-start">
              <LogOutIcon /> Salir
            </Button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
}
