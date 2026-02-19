import { NextResponse } from "next/server";
import { listLiveGames } from "@/lib/hq/live-games";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await listLiveGames();
  return NextResponse.json({
    items,
    generatedAt: new Date().toISOString()
  });
}
