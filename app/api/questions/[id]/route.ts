import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deleteQuestions, getQuestion, updateQuestion } from "@/lib/repository";

const schema = z.object({
  stem: z.string().optional(),
  answer: z.string().optional(),
  analysis: z.string().optional(),
  subject: z.string().optional(),
  knowledgePoint: z.string().optional(),
  wrongReason: z.string().optional(),
  notebookId: z.string().nullable().optional(),
  mastery: z.number().min(0).max(100).optional()
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const question = await getQuestion(id);
  if (!question) {
    return NextResponse.json({ error: "错题不存在" }, { status: 404 });
  }
  return NextResponse.json(question);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const input = schema.parse(await request.json());
    const question = await updateQuestion(id, input);
    return NextResponse.json(question);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存失败" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await deleteQuestions([id]);
  return NextResponse.json(result);
}
