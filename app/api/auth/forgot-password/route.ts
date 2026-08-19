import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase";

// 忘记密码：给邮箱发送重置邮件。
// 邮件里的重置链接会跳转到 app 的 /reset-password 页面（redirectTo 来自请求的 origin），
// 用户在该页面设置新密码。因为不走 supabase.co 域名，大陆网络也能打开。
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

  // 用请求的来源地址作为重置链接落地页，保证跳回 app 而不是 supabase.co
  const origin = request.headers.get("origin") ?? "";
  const options = origin ? { redirectTo: `${origin}/reset-password` } : {};

  const { error } = await client.auth.resetPasswordForEmail(email, options);
  if (error) {
    // 不暴露「邮箱是否存在」，统一提示
    return NextResponse.json(
      { error: "发送失败，请稍后重试" },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
