import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "accfenix_admin";

// Solo verifica que exista la cookie; la validez real del JWT la controla la API en cada llamada.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  if (!req.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
