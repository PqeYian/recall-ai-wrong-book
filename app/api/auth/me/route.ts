import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = request.cookies.get("recall_session")?.value;
  if (!session) {
    return NextResponse.json({ user: null });
  }
  const db = await readDb();
  const user =
    db.users.find((u) => u.id === session) ??
    db.users.find((u) => u.id === "demo-user") ?? null;
  return NextResponse.json({ user });
}
