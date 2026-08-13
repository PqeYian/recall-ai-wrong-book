import { NextRequest, NextResponse } from "next/server";
import {
  LOCAL_SESSION_PREFIX,
  SUPABASE_SESSION_PREFIX,
  setSessionCookie
} from "@/lib/auth";
import { persistDb, readDb } from "@/lib/db";
import { createSessionToken, hashPassword } from "@/lib/password";
import { createServiceClient, hasSupabaseEnv } from "@/lib/supabase";
import { uid } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    name?: string;
  };
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const name = body.name?.trim() ?? "";
  if (!email || !password || !name) {
    return NextResponse.json(
      { error: "请完整填写昵称、邮箱和密码" },
      { status: 400 }
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "密码至少需要 6 位" }, { status: 400 });
  }

  if (hasSupabaseEnv()) {
    const client = createServiceClient();
    if (!client) {
      return NextResponse.json({ error: "Supabase 未配置" }, { status: 500 });
    }
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data.session) {
      return NextResponse.json({ ok: true, needsEmailConfirmation: true });
    }
    const response = NextResponse.json({ ok: true });
    setSessionCookie(
      response,
      `${SUPABASE_SESSION_PREFIX}${data.session.access_token}`
    );
    return response;
  }

  const db = await readDb();
  if (db.users.some((u) => u.email.toLowerCase() === email)) {
    return NextResponse.json({ error: "该邮箱已注册" }, { status: 400 });
  }

  const user = {
    id: uid(),
    email,
    name,
    passwordHash: hashPassword(password),
    sessionToken: createSessionToken(),
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  db.settings[user.id] = {
    reminderTime: "20:00",
    notifyEnabled: false,
    examDays: 7,
    onboardingDone: false
  };
  await persistDb(db);

  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, `${LOCAL_SESSION_PREFIX}${user.sessionToken}`);
  return response;
}
