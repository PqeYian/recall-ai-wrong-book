import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withUserId } from "./context";
import { readDb } from "./db";
import {
  LOCAL_SESSION_PREFIX,
  SESSION_COOKIE,
  SUPABASE_SESSION_PREFIX
} from "./session";
import { createSupabaseClient } from "./supabase";

export {
  LOCAL_SESSION_PREFIX,
  SESSION_COOKIE,
  SUPABASE_SESSION_PREFIX
} from "./session";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  provider: "local" | "supabase";
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge
  };
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(
    SESSION_COOKIE,
    token,
    cookieOptions(60 * 60 * 24 * 7)
  );
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(
    SESSION_COOKIE,
    "",
    cookieOptions(0)
  );
}

export async function getSessionUser(
  request: NextRequest
): Promise<SessionUser | null> {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  if (raw.startsWith(LOCAL_SESSION_PREFIX)) {
    const token = raw.slice(LOCAL_SESSION_PREFIX.length);
    const db = await readDb();
    const user = db.users.find((u) => u.sessionToken === token);
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      provider: "local"
    };
  }

  if (raw.startsWith(SUPABASE_SESSION_PREFIX)) {
    const token = raw.slice(SUPABASE_SESSION_PREFIX.length);
    const client = createSupabaseClient();
    if (!client) return null;
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return null;
    const metadata = data.user.user_metadata as { name?: string } | undefined;
    return {
      id: data.user.id,
      email: data.user.email ?? "",
      name: metadata?.name || data.user.email?.split("@")[0] || "用户",
      provider: "supabase"
    };
  }

  return null;
}

export async function withUser(
  request: NextRequest,
  handler: (user: SessionUser, request: NextRequest) => Promise<Response>
): Promise<Response> {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  return withUserId(user.id, () => handler(user, request));
}
