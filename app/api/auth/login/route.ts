import { NextRequest, NextResponse } from "next/server";
import {
  LOCAL_SESSION_PREFIX,
  SUPABASE_SESSION_PREFIX,
  setSessionCookie
} from "@/lib/auth";
import { persistDb, readDb } from "@/lib/db";
import { createSessionToken, verifyPassword } from "@/lib/password";
import { createServiceClient, hasSupabaseEnv } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
  };
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "请输入邮箱和密码" }, { status: 400 });
  }

  if (hasSupabaseEnv()) {
    const client = createServiceClient();
    if (!client) {
      return NextResponse.json({ error: "Supabase 未配置" }, { status: 500 });
    }
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });
    if (error || !data.session) {
      // 把 Supabase 的英文错误转成用户能看懂的中文提示
      const msg = error?.message ?? "";
      let hint = "登录失败，请稍后重试";
      if (/invalid login credentials/i.test(msg)) {
        hint = "邮箱或密码错误";
      } else if (/email not confirmed/i.test(msg)) {
        hint = "请先到邮箱点击确认链接后再登录";
      }
      return NextResponse.json({ error: hint }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true });
    setSessionCookie(
      response,
      `${SUPABASE_SESSION_PREFIX}${data.session.access_token}`
    );
    return response;
  }

  const db = await readDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email);
  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  user.sessionToken = createSessionToken();
  await persistDb(db);
  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, `${LOCAL_SESSION_PREFIX}${user.sessionToken}`);
  return response;
}
