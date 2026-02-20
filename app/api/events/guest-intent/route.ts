import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import {
  canEventCollectGuests,
  getEventSignupConfig,
  isDvhlEvent,
  upsertEventGuestIntent
} from "@/lib/hq/event-signups";
import { getAllEvents } from "@/lib/hq/events";

function getReturnPath(raw: string) {
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/player?section=events";
  }
  return value;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=sign_in_required", request.url), 303);
  }

  if (user.role !== "admin" && (user.role !== "player" || user.status !== "approved")) {
    return NextResponse.redirect(new URL("/player?error=approval_required", request.url), 303);
  }

  const formData = await request.formData();
  const eventId = String(formData.get("eventId") ?? "").trim();
  const returnTo = getReturnPath(String(formData.get("returnTo") ?? "/player?section=events"));
  const wantsGuest = String(formData.get("wantsGuest") ?? "no").trim() === "yes";
  const guestCountRaw = String(formData.get("guestCount") ?? "1").trim();
  const guestCount = Number(guestCountRaw);
  const note = String(formData.get("guestNote") ?? "").trim();

  if (!eventId) {
    return NextResponse.redirect(
      new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=missing_event_id`, request.url),
      303
    );
  }

  const [allEvents, signupConfig] = await Promise.all([
    getAllEvents(),
    getEventSignupConfig(eventId)
  ]);
  const event = allEvents.find((entry) => entry.id === eventId);

  if (!event) {
    return NextResponse.redirect(
      new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=event_not_found`, request.url),
      303
    );
  }

  if (isDvhlEvent(event.eventTypeName)) {
    return NextResponse.redirect(
      new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=guest_requests_not_allowed_for_dvhl`, request.url),
      303
    );
  }

  if (!canEventCollectGuests(signupConfig, event.eventTypeName)) {
    return NextResponse.redirect(
      new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=guest_requests_not_enabled`, request.url),
      303
    );
  }

  try {
    await upsertEventGuestIntent({
      eventId,
      userId: user.id,
      wantsGuest,
      guestCount: Number.isFinite(guestCount) ? guestCount : 1,
      note
    });
    return NextResponse.redirect(
      new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}guest=saved`, request.url),
      303
    );
  } catch {
    return NextResponse.redirect(
      new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=guest_intent_save_failed`, request.url),
      303
    );
  }
}
