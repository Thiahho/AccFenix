"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { LayoutDashboard } from "lucide-react";
import { hasAdminHint } from "@/lib/admin/admin-hint";

const subscribe = () => () => {};
const readHint = () => hasAdminHint(document.cookie);
const serverHint = () => false;

/** Shortcut back to the admin panel, shown only to a browser that logged in as admin. */
export function AdminLink() {
  const isAdmin = useSyncExternalStore(subscribe, readHint, serverHint);
  if (!isAdmin) return null;

  return (
    <Link
      href="/admin"
      prefetch={false}
      aria-label="Ir al panel de administración"
      className="poster-focus-inset inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full px-3 text-[13px] font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:px-5"
    >
      <LayoutDashboard className="size-5" aria-hidden />
      <span className="hidden lg:inline">Admin</span>
    </Link>
  );
}
