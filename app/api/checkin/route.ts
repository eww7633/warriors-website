import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const playerId = String(body.playerId ?? "").trim();
  const eventId = String(body.eventId ?? "").trim();

  if (!playerId || !eventId) {
    return NextResponse.json({ error: "playerId and eventId are required." }, { status: 400 });
  }

  return NextResponse.json({
    status: "ok",
    checkedInAt: new Date().toISOString(),
    playerId,
    eventId
  });
}
