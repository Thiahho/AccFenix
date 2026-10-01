import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { searchDirecciones } from "@/lib/geo-server";

const nearSchema = z.object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) });

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 3) return NextResponse.json({ items: [] });
  const near = params.has("lat") ? nearSchema.safeParse({ lat: params.get("lat"), lng: params.get("lng") }) : null;
  try {
    return NextResponse.json({ items: await searchDirecciones(q, near?.success ? near.data : null) });
  } catch {
    return NextResponse.json({ items: [], error: "sin-servicio" }, { status: 502 });
  }
}
