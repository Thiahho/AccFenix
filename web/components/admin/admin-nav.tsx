"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderTreeIcon, PackageIcon, SettingsIcon, TagsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin/productos", label: "Productos", icon: PackageIcon },
  { href: "/admin/categorias", label: "Categorías", icon: FolderTreeIcon },
  { href: "/admin/atributos", label: "Atributos", icon: TagsIcon },
  { href: "/admin/configuracion", label: "Configuración", icon: SettingsIcon },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Panel" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
      {links.map((l) => {
        const active = pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              active ? "bg-brand-soft font-medium text-brand" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <l.icon aria-hidden className="size-4" />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
