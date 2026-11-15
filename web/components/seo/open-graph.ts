import type { Metadata } from "next";
import { site } from "@/lib/site";

/**
 * Site-wide Open Graph fields. A page that sets its own `openGraph` replaces the inherited one entirely,
 * so it must spread this base to keep type, locale and site name. Title and description are left out on
 * purpose: Next fills them from each page's own metadata.
 */
export const baseOpenGraph = {
  type: "website",
  locale: "es_AR",
  siteName: site.name,
} satisfies NonNullable<Metadata["openGraph"]>;
