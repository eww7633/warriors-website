import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/hq/session";
import { trackMobileAnalyticsEvent } from "@/lib/hq/mobile-analytics";

export async function POST(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: {
    name?: string;
    eventId?: string;
    screen?: string;
    metadata?: Record<string, unknown>;
    occurredAt?: string;
  } = {};
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const name = String(payload.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "analytics_event_name_required" }, { status: 400 });
  }

  try {
    const tracked = await trackMobileAnalyticsEvent({
      userId: user.id,
      name,
      eventId: payload.eventId,
      screen: payload.screen,
      metadata: payload.metadata,
      occurredAt: payload.occurredAt
    });
    return NextResponse.json({ ok: true, id: tracked.id, receivedAt: tracked.receivedAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "analytics_track_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
