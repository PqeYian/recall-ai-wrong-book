import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login"];
const AUTH_API_PATHS = ["/api/auth/login", "/api/auth/register", "/api/auth/me"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("recall_session")?.value;
  const hasSession = Boolean(session);

  if (pathname.startsWith("/api/")) {
    if (AUTH_API_PATHS.includes(pathname) || pathname.startsWith("/api/auth/logout")) {
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
    // Let first-time visitors enter the main page in demo mode.
    if (pathname === "/") {
      const response = NextResponse.next();
      response.cookies.set("recall_session", "demo-user", {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/"
      });
      return response;
    }

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
