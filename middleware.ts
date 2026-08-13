import { NextRequest, NextResponse } from "next/server";
import {
  LOCAL_SESSION_PREFIX,
  SESSION_COOKIE,
  SUPABASE_SESSION_PREFIX
} from "@/lib/session";

const PUBLIC_PATHS = ["/login"];
const AUTH_API_PATHS = ["/api/auth/login", "/api/auth/register", "/api/auth/me"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  const hasSession = Boolean(
    session?.startsWith(LOCAL_SESSION_PREFIX) ||
      session?.startsWith(SUPABASE_SESSION_PREFIX)
  );

  if (pathname.startsWith("/api/")) {
    if (
      AUTH_API_PATHS.includes(pathname) ||
      pathname.startsWith("/api/auth/logout")
    ) {
      return NextResponse.next();
    }
    if (!hasSession) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (!isPublic && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isPublic && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
