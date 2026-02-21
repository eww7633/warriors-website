import { NextResponse } from "next/server";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { createEvent, createEventType, listEventTypes } from "@/lib/hq/events";
import { isDvhlEvent, upsertEventSignupConfig } from "@/lib/hq/event-signups";
import { getCurrentUser } from "@/lib/hq/session";

function withParam(path: string, key: string, value: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();

  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const startsAt = String(formData.get("startsAt") ?? "").trim();
  const locationPublic = String(formData.get("locationPublic") ?? "").trim();
  const eventKind = String(formData.get("eventKind") ?? "off_ice").trim();
  const returnToRaw = String(formData.get("returnTo") ?? "").trim();
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/admin?section=events";

  if (!title || !startsAt) {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "missing_event_fields"), request.url), 303);
  }

  const presets: Record<
    string,
    {
      eventTypeName: string;
      signupMode: "straight_rsvp" | "interest_gathering";
      visibility: "public" | "player_only" | "internal";
      publicDetails: string;
      privateDetails: string;
      allowGuestRequests: boolean;
    }
  > = {
    off_ice: {
      eventTypeName: "Off-Ice",
      signupMode: "straight_rsvp",
      visibility: "public",
      publicDetails: "Community event for veterans, families, and supporters.",
      privateDetails: "Hockey Ops can update logistics as details are confirmed.",
      allowGuestRequests: true
    },
    volunteer: {
      eventTypeName: "Volunteer",
      signupMode: "straight_rsvp",
      visibility: "public",
      publicDetails: "Volunteer opportunity supporting the Pittsburgh Warriors mission.",
      privateDetails: "Please monitor staffing assignments and outreach tasks.",
      allowGuestRequests: false
    },
    hockey_interest: {
      eventTypeName: "Tournament / Hockey",
      signupMode: "interest_gathering",
      visibility: "player_only",
      publicDetails: "Hockey event sign-up is open. Submit interest before roster selection closes.",
      privateDetails: "Final roster will be selected by Hockey Ops and announced after close.",
      allowGuestRequests: false
    },
    hockey_rsvp: {
      eventTypeName: "Practice / Exhibition",
      signupMode: "straight_rsvp",
      visibility: "player_only",
      publicDetails: "Player RSVP is open for this hockey event.",
      privateDetails: "Use attendance and RSVP boards for planning.",
      allowGuestRequests: false
    }
  };

  const preset = presets[eventKind] || presets.off_ice;

  if (isDvhlEvent(preset.eventTypeName)) {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "dvhl_events_must_use_dvhl_hub"), request.url), 303);
  }

  try {
    const eventTypes = await listEventTypes();
    let eventType = eventTypes.find((entry) => entry.name.toLowerCase() === preset.eventTypeName.toLowerCase());
    if (!eventType) {
      eventType = await createEventType({ name: preset.eventTypeName });
    }

    const event = await createEvent({
      title,
      startsAt,
      publicDetails: preset.publicDetails,
      privateDetails: preset.privateDetails,
      visibility: preset.visibility,
      published: true,
      locationPublic,
      locationPrivate: "",
      locationPublicMapUrl: "",
      locationPrivateMapUrl: "",
      eventTypeId: eventType.id,
      managerUserId: undefined
    });

    await upsertEventSignupConfig({
      eventId: event.id,
      signupMode: preset.signupMode,
      allowGuestRequests: preset.allowGuestRequests,
      guestCostEnabled: false,
      requiresUsaHockeyVerified: eventKind.startsWith("hockey_"),
      updatedByUserId: actor.id
    });

    return NextResponse.redirect(new URL(withParam(returnTo, "eventsaved", "1"), request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "event_create_failed"), request.url), 303);
  }
}
