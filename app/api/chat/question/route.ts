import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAiProvider } from "@/lib/providers/ai";
import { addChatQuestion } from "@/lib/repository";

const schema = z.object({
  conversationId: z.string(),
  messageId: z.string(),
  stem: z.string().min(1),
  answer: z.string().optional(),
  subject: z.string().optional(),
  knowledgePoint: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const input = schema.parse(await request.json());
    const result = await addChatQuestion({
      conversationId: input.conversationId,
      messageId: input.messageId,
      stem: input.stem,
      answer: input.answer,
      subject: input.subject,
      knowledgePoint: input.knowledgePoint
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "加入错题本失败" },
      { status: 400 }
    );
  }
}
