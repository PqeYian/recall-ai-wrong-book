import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@/lib/auth";
import { reorderNotebooks } from "@/lib/repository";

const schema = z.object({
  ids: z.array(z.string()).min(1)
});

export async function POST(request: NextRequest) {
  return withUser(request, async () => {
    try {
    const input = schema.parse(await request.json());
    const result = await reorderNotebooks(input.ids);
    return NextResponse.json(result);
    } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "排序失败" },
      { status: 400 }
    );
    }
  });
}
