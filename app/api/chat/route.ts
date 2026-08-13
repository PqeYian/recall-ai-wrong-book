import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@/lib/auth";
import {
  createConversation,
  deleteConversation,
  listConversations,
  updateConversation
} from "@/lib/repository";

const schema = z.object({
  title: z.string().default("新会话"),
  subject: z.string().default("通用")
});

export async function GET(request: NextRequest) {
  return withUser(request, async () => {
    const conversations = await listConversations();
    return NextResponse.json(conversations);
  });
}

export async function POST(request: NextRequest) {
  return withUser(request, async () => {
    try {
    const input = schema.parse(await request.json());
    const conversation = await createConversation(input);
    return NextResponse.json(conversation, { status: 201 });
    } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建会话失败" },
      { status: 400 }
    );
    }
  });
}
