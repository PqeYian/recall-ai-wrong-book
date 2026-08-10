import { NextResponse } from "next/server";
import { getUsage } from "@/lib/repository";

export async function GET() {
  const usage = await getUsage();
  return NextResponse.json(usage);
}
