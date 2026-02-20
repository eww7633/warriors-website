import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/hq/session";
import {
  canEventCollectGuests,
  getEventSignupConfig,
  isDvhlEvent,
  upsertEventGuestIntent
} from "@/lib/hq/event-signups";
import { getAllEvents } from "@/lib/hq/events";

export async function POST(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (user.role !== "admin" && (user.role !== "player" || user.status !== "approved")) {
    return NextResponse.json({ error: "approval_required" }, { status: 403 });
  }

  let payload: { eventId?: string; wantsGuest?: boolean; guestCount?: number; guestNote?: string } = {};
  try {
    payload = (await request.json()) as {
      eventId?: string;
      wantsGuest?: boolean;
      guestCount?: number;
      guestNote?: string;
    };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const eventId = String(payload.eventId ?? "").trim();
  const wantsGuest = Boolean(payload.wantsGuest);
  const guestCount = Number(payload.guestCount ?? 1);
  const guestNote = String(payload.guestNote ?? "").trim();

  if (!eventId) {
    return NextResponse.json({ error: "missing_event_id" }, { status: 400 });
  }

  const [allEvents, signupConfig] = await Promise.all([
    getAllEvents(),
    getEventSignupConfig(eventId)
  ]);
  const event = allEvents.find((entry) => entry.id === eventId);
  if (!event) {
    return NextResponse.json({ error: "event_not_found" }, { status: 404 });
  }
  if (isDvhlEvent(event.eventTypeName)) {
    return NextResponse.json({ error: "guest_requests_not_allowed_for_dvhl" }, { status: 403 });
  }
  if (!canEventCollectGuests(signupConfig, event.eventTypeName)) {
    return NextResponse.json({ error: "guest_requests_not_enabled" }, { status: 403 });
  }

  try {
    await upsertEventGuestIntent({
      eventId,
      userId: user.id,
      wantsGuest,
      guestCount: Number.isFinite(guestCount) ? guestCount : 1,
      note: guestNote
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "guest_intent_save_failed" }, { status: 500 });
  }
}
