import { NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/auth";
import { getUsage } from "@/lib/repository";

export async function GET(request: NextRequest) {
  return withUser(request, async () => {
    const usage = await getUsage();
    return NextResponse.json(usage);
  });
}
