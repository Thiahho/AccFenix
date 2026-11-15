import { NextResponse, type NextRequest } from "next/server";
import { resolveMapsUrl } from "@/lib/geo-server";
import { geoRateLimit } from "../limit";

export async function GET(req: NextRequest) {
  const limited = geoRateLimit("ubicacion", req.headers);
  if (limited) return limited;
  const url = (req.nextUrl.searchParams.get("url") ?? "").trim();
  if (!url || url.length > 2000) return NextResponse.json({ error: "link-invalido" }, { status: 422 });

  const result = await resolveMapsUrl(url);
  if (typeof result === "string") {
    return NextResponse.json({ error: result }, { status: result === "sin-servicio" ? 502 : 422 });
  }
  return NextResponse.json({ lugar: result });
}
