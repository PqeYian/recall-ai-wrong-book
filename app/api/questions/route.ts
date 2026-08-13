import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@/lib/auth";
import {
  createQuestions,
  deleteQuestions,
  listQuestions,
  moveQuestions
} from "@/lib/repository";

const createSchema = z.object({
  questions: z
    .array(
      z.object({
        stem: z.string().min(1),
        answer: z.string().default(""),
        analysis: z.string().default(""),
        subject: z.string().default("未分类"),
        knowledgePoint: z.string().default("未归类"),
        wrongReason: z.string().default("待确认"),
        notebookId: z.string().optional(),
        confidence: z.string().optional(),
        source: z.string().optional()
      })
    )
    .min(1)
});

export async function GET(request: NextRequest) {
  return withUser(request, async () => {
    const params = request.nextUrl.searchParams;
    const result = await listQuestions({
    search: params.get("search") ?? undefined,
    subject: params.get("subject") ?? undefined,
    knowledgePoint: params.get("knowledgePoint") ?? undefined,
    notebookId: params.get("notebookId") ?? undefined,
    reviewLevel: params.get("reviewLevel") ?? undefined,
    timeRange: params.get("timeRange") ?? undefined,
    sort: (params.get("sort") as "due" | "created" | "mastery" | "accuracy") ?? undefined,
    page: Number(params.get("page") ?? 1),
    pageSize: Number(params.get("pageSize") ?? 20)
    });
    return NextResponse.json(result);
  });
}

export async function POST(request: NextRequest) {
  return withUser(request, async () => {
    try {
    const input = createSchema.parse(await request.json());
    const result = await createQuestions(input.questions);
    return NextResponse.json(result, { status: 201 });
    } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "导入失败" },
      { status: 400 }
    );
    }
  });
}

export async function PATCH(request: NextRequest) {
  return withUser(request, async () => {
    try {
    const body = (await request.json()) as {
      ids: string[];
      notebookId?: string;
    };
    if (!Array.isArray(body.ids) || !body.ids.length) {
      return NextResponse.json({ error: "请选择错题" }, { status: 400 });
    }
    const result = await moveQuestions(body.ids, body.notebookId);
    return NextResponse.json(result);
    } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "移动失败" },
      { status: 400 }
    );
    }
  });
}

export async function DELETE(request: NextRequest) {
  return withUser(request, async () => {
    try {
    const body = (await request.json()) as { ids: string[] };
    if (!Array.isArray(body.ids) || !body.ids.length) {
      return NextResponse.json({ error: "请选择错题" }, { status: 400 });
    }
    const result = await deleteQuestions(body.ids);
    return NextResponse.json(result);
    } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除失败" },
      { status: 400 }
    );
    }
  });
}
