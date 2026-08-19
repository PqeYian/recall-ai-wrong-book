import { NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/auth";
import { persistDb, readDb } from "@/lib/db";
import { createServiceClient } from "@/lib/supabase";

// 修改昵称（登录后调用）。
// supabase 用户：更新 auth.users 的 user_metadata.name；
// 本地用户：更新 db.json 中的 users 表。
export async function PATCH(request: NextRequest) {
  return withUser(request, async (user) => {
    const body = (await request.json()) as { name?: string };
    const name = body.name?.trim() ?? "";
    if (!name) {
      return NextResponse.json({ error: "昵称不能为空" }, { status: 400 });
    }
    if (name.length > 20) {
      return NextResponse.json({ error: "昵称最长 20 个字" }, { status: 400 });
    }

    if (user.provider === "supabase") {
      const service = createServiceClient();
      if (!service) {
        return NextResponse.json({ error: "Supabase 未配置" }, { status: 500 });
      }
      const { error } = await service.auth.admin.updateUserById(user.id, {
        user_metadata: { name }
      });
      if (error) {
        return NextResponse.json({ error: "修改失败，请稍后重试" }, { status: 400 });
      }
    } else {
      const db = await readDb();
      const target = db.users.find((u) => u.id === user.id);
      if (target) {
        target.name = name;
        await persistDb(db);
      }
    }

    return NextResponse.json({ ok: true, name });
  });
}
