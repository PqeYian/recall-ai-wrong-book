import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createNotebook, listNotebooks } from "@/lib/repository";

const schema = z.object({
  name: z.string().min(1).max(20),
  color: z.string(),
  defaultSubject: z.string().default("")
});

export async function GET() {
  const notebooks = await listNotebooks();
  return NextResponse.json(notebooks);
}

export async function POST(request: NextRequest) {
  try {
    const input = schema.parse(await request.json());
    const notebook = await createNotebook(input);
    return NextResponse.json(notebook, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建失败" },
      { status: 400 }
    );
  }
}
