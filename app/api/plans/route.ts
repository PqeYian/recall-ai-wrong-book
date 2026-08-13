import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@/lib/auth";
import { getPlans, updatePlanSettings } from "@/lib/repository";

const schema = z.object({
  reminderTime: z.string().optional(),
  notifyEnabled: z.boolean().optional(),
  examDate: z.string().optional(),
  examDays: z.number().min(1).max(30).optional(),
  onboardingDone: z.boolean().optional()
});

export async function GET(request: NextRequest) {
  return withUser(request, async () => {
    const plans = await getPlans();
    return NextResponse.json(plans);
  });
}

export async function POST(request: NextRequest) {
  return withUser(request, async () => {
    try {
    const input = schema.parse(await request.json());
    const settings = await updatePlanSettings(input);
    return NextResponse.json(settings);
    } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存失败" },
      { status: 400 }
    );
    }
  });
}
