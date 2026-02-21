import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/hq/session";
import { getEventSignupConfig, isInterestSignupClosed } from "@/lib/hq/event-signups";
import { setEventReservation } from "@/lib/hq/reservations";
import { enqueueMobilePushTrigger } from "@/lib/hq/mobile-push";

export async function POST(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin" && (user.role !== "player" || user.status !== "approved")) {
    return NextResponse.json({ error: "approval_required" }, { status: 403 });
  }

  let payload: { eventId?: string } = {};
  try {
    payload = (await request.json()) as { eventId?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const eventId = String(payload.eventId ?? "").trim();
  if (!eventId) {
    return NextResponse.json({ error: "event_id_required" }, { status: 400 });
  }

  const signupConfig = await getEventSignupConfig(eventId);
  if (signupConfig?.signupMode !== "interest_gathering") {
    return NextResponse.json({ error: "approval_queue_not_enabled" }, { status: 400 });
  }
  if (isInterestSignupClosed(signupConfig)) {
    return NextResponse.json({ error: "interest_signup_closed" }, { status: 403 });
  }

  await setEventReservation({
    userId: user.id,
    eventId,
    status: "going",
    note: "REQUEST_APPROVAL"
  });
  await enqueueMobilePushTrigger({
    type: "rsvp_updated",
    actorUserId: user.id,
    targetUserId: user.id,
    eventId,
    title: "RSVP approval requested",
    body: `${user.fullName} requested roster approval.`,
    payload: {
      channel: "mobile",
      approvalRequest: true
    }
  });

  return NextResponse.json({
    ok: true,
    request: {
      eventId,
      userId: user.id,
      status: "going",
      viewerNeedsApproval: true
    }
  });
}
