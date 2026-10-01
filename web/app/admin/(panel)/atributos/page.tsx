import type { Metadata } from "next";
import { AttributesEditor } from "@/components/admin/attributes-editor";
import { PageHeader } from "@/components/admin/page-header";
import { adminFetch } from "@/lib/admin/session";
import type { AdminAttribute } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Atributos" };

export default async function AttributesPage() {
  const attributes = await adminFetch<AdminAttribute[]>("/api/admin/attributes");

  return (
    <div className="max-w-3xl">
      <PageHeader title="Atributos" description="Opciones que combinan los productos: medida, grosor, color u otras nuevas." />
      <AttributesEditor attributes={attributes} />
    </div>
  );
}
