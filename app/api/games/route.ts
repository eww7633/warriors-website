import { NextResponse } from "next/server";
import { games } from "@/lib/mockData";

export async function GET() {
  return NextResponse.json({
    items: games,
    generatedAt: new Date().toISOString()
  });
}
