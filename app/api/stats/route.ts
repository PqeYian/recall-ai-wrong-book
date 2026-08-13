import { NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/auth";
import { getStats } from "@/lib/repository";

export async function GET(request: NextRequest) {
  return withUser(request, async () => {
    const stats = await getStats();
    return NextResponse.json(stats);
  });
}
