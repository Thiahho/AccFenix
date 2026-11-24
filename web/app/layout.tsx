import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import { baseOpenGraph } from "@/components/seo/open-graph";
import { Toaster } from "@/components/ui/sonner";
import { site } from "@/lib/site";
import "./globals.css";

// Shared typeface. The public design adds its handwritten font in components/site/poster-fonts.ts.
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — ${site.tagline}`, template: `%s · ${site.name}` },
  description: site.description,
  // The image comes from app/opengraph-image.tsx; title and description are filled per page by Next.
  openGraph: baseOpenGraph,
  twitter: { card: "summary_large_image" },
};

// "resizes-content": on Android the on-screen keyboard shrinks the layout (and dvh), so suggestion lists and the
// province sheet stay above it instead of underneath.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#4A2C1D",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR" className={montserrat.variable}>
      <body className="antialiased">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
