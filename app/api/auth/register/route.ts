import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseEnv, createServiceClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    name?: string;
  };
  if (!body.email?.trim() || !body.password || !body.name?.trim()) {
    return NextResponse.json(
      { error: "请完整填写昵称、邮箱和密码" },
      { status: 400 }
    );
  }

  if (hasSupabaseEnv()) {
    const client = createServiceClient();
    const { error } = await client?.auth.signUp({
      email: body.email,
      password: body.password,
      options: { data: { name: body.name } }
    }) ?? { error: new Error("Supabase 未配置") };
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("recall_session", "demo-user", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/"
  });
  return response;
}
