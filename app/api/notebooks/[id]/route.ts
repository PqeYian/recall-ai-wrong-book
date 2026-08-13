import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@/lib/auth";
import { deleteNotebook, updateNotebook } from "@/lib/repository";

const schema = z.object({
  name: z.string().min(1).max(20).optional(),
  color: z.string().optional(),
  defaultSubject: z.string().optional(),
  sortOrder: z.number().optional()
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withUser(request, async () => {
    const { id } = await params;
    try {
    const input = schema.parse(await request.json());
    const notebook = await updateNotebook(id, input);
    return NextResponse.json(notebook);
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
    try {
    const result = await deleteNotebook(id);
    return NextResponse.json(result);
    } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除失败" },
      { status: 400 }
    );
    }
  });
}
