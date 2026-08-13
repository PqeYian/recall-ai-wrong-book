import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@/lib/auth";
import {
  deleteConversation,
  updateConversation
} from "@/lib/repository";

const schema = z.object({
  title: z.string().optional(),
  subject: z.string().optional()
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withUser(request, async () => {
    const { id } = await params;
    try {
    const input = schema.parse(await request.json());
    const conversation = await updateConversation(id, input);
    return NextResponse.json(conversation);
    } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新失败" },
      { status: 400 }
    );
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withUser(request, async () => {
    const { id } = await params;
    const result = await deleteConversation(id);
    return NextResponse.json(result);
  });
}
