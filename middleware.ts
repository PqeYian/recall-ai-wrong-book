import { NextRequest, NextResponse } from "next/server";
import {
  LOCAL_SESSION_PREFIX,
  SESSION_COOKIE,
  SUPABASE_SESSION_PREFIX
} from "@/lib/session";

// reset-password 必须放行：用户点重置邮件链接时还没有登录，不能重定向到 /login
const PUBLIC_PATHS = ["/login", "/reset-password"];
const AUTH_API_PATHS = ["/api/auth/login", "/api/auth/register", "/api/auth/me"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 生产环境强制 HTTPS：http 请求一律 308 跳转到 https 同路径。
  // 原因：登录 cookie 带 Secure 属性，手机走 http 时浏览器拒绝保存，
  // 表现为登录成功却立刻闪回登录页。CloudBase 网关转发 x-forwarded-proto 头。
  const proto = request.headers.get("x-forwarded-proto");
  if (proto === "http") {
    // URL 对象的 host 是只读的，直接拼接完整 https 地址。
    // Host 头带原始域名，nextUrl 的 host 是容器内部 0.0.0.0:3000。
    const host = (request.headers.get("host") ?? "").split(":")[0];
    if (host) {
      return NextResponse.redirect(
        `https://${host}${request.nextUrl.pathname}${request.nextUrl.search}`,
        308
      );
    }
  }

  // 静态资源与预渲染资源一律放行，不参与登录保护。
  // 虽然下方 matcher 已排除 _next/static，但 EdgeOne 部署时 matcher 可能不生效，
  // 导致 CSS/JS 被重定向到 /login、UI 渲染失败。这里在逻辑层兜底。
  if (
    pathname.startsWith("/_next/static") ||
    pathname.startsWith("/_next/image") ||
    pathname === "/favicon.ico" ||
    /\.(?:svg|png|jpg|jpeg|gif|webp)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

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
