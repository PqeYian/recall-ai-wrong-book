import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_SESSION_PREFIX, setSessionCookie } from "@/lib/auth";
import { createSupabaseClient } from "@/lib/supabase";

// 校验邮箱验证码并登录。
// type = "email"：免密码登录（signInWithOtp 发出的验证码）
// type = "signup"：注册确认（signUp 确认邮件里的验证码，校验通过同时标记邮箱已验证）
export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    email?: string;
    token?: string;
    type?: string;
  };
  const email = body.email?.trim().toLowerCase() ?? "";
  const token = body.token?.trim() ?? "";
  const type = body.type === "signup" ? "signup" : "email";
  if (!email || !token) {
    return NextResponse.json({ error: "请输入邮箱和验证码" }, { status: 400 });
  }

  const client = createSupabaseClient();
  if (!client) {
    return NextResponse.json({ error: "Supabase 未配置" }, { status: 500 });
  }

  const { data, error } = await client.auth.verifyOtp({
    email,
    token,
    type
  });
  if (error || !data.session) {
    return NextResponse.json({ error: "验证码错误或已过期" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  setSessionCookie(
    response,
    `${SUPABASE_SESSION_PREFIX}${data.session.access_token}`
  );
  return response;
}
