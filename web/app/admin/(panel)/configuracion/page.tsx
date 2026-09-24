import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { adminFetch } from "@/lib/admin/session";
import type { AdminSettings } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const settings = await adminFetch<AdminSettings>("/api/admin/settings");

  return (
    <div className="max-w-xl">
      <PageHeader title="Configuración" />
      <SettingsForm settings={settings} />
    </div>
  );
}
