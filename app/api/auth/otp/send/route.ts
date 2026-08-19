import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase";

// 发送邮箱验证码（免密码登录 / 注册确认）。
// 邮件由 Supabase 发出，模板需在邮件中显示 {{ .Token }}（6 位验证码），
// 用户回到 app 输入验证码完成登录，不依赖打开链接。
export async function POST(request: NextRequest) {
  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase() ?? "";
  if (!email) {
    return NextResponse.json({ error: "请输入邮箱" }, { status: 400 });
  }

  const client = createSupabaseClient();
  if (!client) {
    return NextResponse.json({ error: "Supabase 未配置" }, { status: 500 });
  }

  const { error } = await client.auth.signInWithOtp({ email });
  if (error) {
    return NextResponse.json({ error: "发送失败，请稍后重试" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
