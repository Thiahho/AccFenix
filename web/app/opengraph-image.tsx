import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default share image for every page that does not provide its own (e.g. a product cover). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#B3121B",
          color: "#FFFFFF",
          padding: 80,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 160, fontWeight: 700, letterSpacing: -4 }}>{site.name}</div>
        <div style={{ marginTop: 24, fontSize: 56, opacity: 0.9 }}>{site.tagline}</div>
      </div>
    ),
    size,
  );
}
