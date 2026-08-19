import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// 重置密码：用重置邮件链接里带的 recovery token 修改密码。
// 前端在 /reset-password 页面从 URL hash 中读取 #access_token，随新密码一起提交到这里。
export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    token?: string;
    password?: string;
  };
  const token = body.token?.trim() ?? "";
  const password = body.password ?? "";
  if (!token) {
    return NextResponse.json({ error: "重置链接无效，请重新申请" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "新密码至少需要 6 位" }, { status: 400 });
  }

  const client = createServiceClient();
  if (!client) {
    return NextResponse.json({ error: "Supabase 未配置" }, { status: 500 });
  }

  // 校验 recovery token 是否有效并拿到用户
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json(
      { error: "重置链接无效或已过期，请重新申请" },
      { status: 400 }
    );
  }

  const { error: updateError } = await client.auth.admin.updateUserById(
    data.user.id,
    { password }
  );
  if (updateError) {
    return NextResponse.json({ error: "修改失败，请稍后重试" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
