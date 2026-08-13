import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@/lib/auth";
import { getCurrentUserId, withUserId } from "@/lib/context";
import { readDb } from "@/lib/db";
import { getAiProvider } from "@/lib/providers/ai";
import { addMessage } from "@/lib/repository";

const schema = z.object({
  conversationId: z.string(),
  subject: z.string().default("通用")
});

export async function POST(request: NextRequest) {
  return withUser(request, async (user) => {
    let input: z.infer<typeof schema>;
    try {
      input = schema.parse(await request.json());
    } catch {
      return NextResponse.json({ error: "请求参数不完整" }, { status: 400 });
    }

    const db = await readDb();
    const conversation = db.conversations.find(
      (c) => c.userId === getCurrentUserId() && c.id === input.conversationId
    );
    if (!conversation) {
      return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    }
    const messages = db.messages
      .filter((m) => m.conversationId === input.conversationId)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      .map((m) => ({ role: m.role, content: m.content }));

    const ai = getAiProvider();
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let content = "";
        try {
          for await (const token of ai.chatStream(messages, input.subject)) {
            content += token;
            controller.enqueue(encoder.encode(token));
          }
          const message = await withUserId(user.id, () =>
            addMessage({
              conversationId: input.conversationId,
              role: "assistant",
              content,
              containsQuestion: /(练习|题目|求)[^。]*[？?]/.test(content),
              addedToBook: false
            })
          );
          controller.enqueue(
            encoder.encode(
              `\n\n__RECALL_DONE__${JSON.stringify(message)}`
            )
          );
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `\n\n__RECALL_ERROR__${
                error instanceof Error ? error.message : "回答已中断"
              }`
            )
          );
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      }
    });
  });
}
