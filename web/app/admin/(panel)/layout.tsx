import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLinkIcon, LogOutIcon } from "lucide-react";
import { logoutAction } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: { default: "Panel", template: `%s · Panel ${site.name}` }, robots: { index: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-muted/40 md:grid md:grid-cols-[220px_1fr]">
      <aside className="flex flex-col border-b bg-background md:sticky md:top-0 md:h-dvh md:border-r md:border-b-0">
        <div className="flex h-14 items-center gap-2 px-4 font-semibold">
          <span aria-hidden className="grid size-7 place-items-center rounded-md bg-brand text-xs font-bold text-brand-foreground">
            {site.name.charAt(0)}
          </span>
          Panel {site.name}
        </div>
        <AdminNav />
        <div className="mt-auto flex gap-1 px-3 pb-3 md:block md:space-y-1 md:p-3">
          <Button asChild variant="ghost" className="justify-start md:w-full">
            <Link href="/" target="_blank">
              <ExternalLinkIcon /> Ver sitio
            </Link>
          </Button>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" className="justify-start md:w-full">
              <LogOutIcon /> Salir
            </Button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
}
