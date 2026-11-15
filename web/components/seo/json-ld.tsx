import { serializeJsonLd } from "@/lib/seo/json-ld";

/** Renders schema.org structured data; see `serializeJsonLd` for why API values cannot break out of the tag. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
