import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addContactRequest } from "@/lib/repository";

const schema = z.object({
  email: z.string().email(),
  category: z.string().min(1),
  content: z.string().min(5)
});

export async function POST(request: NextRequest) {
  try {
    const input = schema.parse(await request.json());
    await addContactRequest(input);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "提交失败" },
      { status: 400 }
    );
  }
}
