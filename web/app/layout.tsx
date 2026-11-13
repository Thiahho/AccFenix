import type { Metadata, Viewport } from "next";
import { Montserrat, Yellowtail } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { site } from "@/lib/site";
import "./globals.css";

// Montserrat is a variable font: one file covers body text and the 700–900 display titles.
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });
// Yellowtail is only used by the "Eggy" wordmark.
const yellowtail = Yellowtail({ variable: "--font-yellowtail", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — ${site.tagline}`, template: `%s · ${site.name}` },
  description: site.description,
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#B3121B" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR" className={`${montserrat.variable} ${yellowtail.variable}`}>
      <body className="antialiased">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
