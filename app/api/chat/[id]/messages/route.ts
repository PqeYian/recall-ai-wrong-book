import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addMessage, getMessages } from "@/lib/repository";

const schema = z.object({
  content: z.string().min(1),
  subject: z.string().default("通用")
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const messages = await getMessages(id);
  return NextResponse.json(messages);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const input = schema.parse(await request.json());
    const message = await addMessage({
      conversationId: id,
      role: "user",
      content: input.content,
      containsQuestion: false,
      addedToBook: false
    });
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "发送失败" },
      { status: 400 }
    );
  }
}
