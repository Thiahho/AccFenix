import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

const disallow = ["/admin", "/pedido", "/resena"];

// AI search and assistant crawlers, allowed explicitly so the catalog can be cited in AI answers.
const aiCrawlers = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "PerplexityBot",
  "Google-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      { userAgent: aiCrawlers, allow: "/", disallow },
    ],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
