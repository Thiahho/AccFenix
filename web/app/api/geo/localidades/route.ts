import { NextResponse, type NextRequest } from "next/server";
import { searchLocalidades } from "@/lib/geo-server";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ items: [] });
  try {
    return NextResponse.json({ items: await searchLocalidades(q) });
  } catch {
    return NextResponse.json({ items: [], error: "sin-servicio" }, { status: 502 });
  }
}
