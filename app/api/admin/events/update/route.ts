import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { listEventTypes, updateEvent } from "@/lib/hq/events";
import { isDvhlEvent, upsertEventSignupConfig } from "@/lib/hq/event-signups";

function withParam(path: string, key: string, value: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}

function toGoogleMapsSearchUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();

  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const eventId = String(formData.get("eventId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const startsAt = String(formData.get("startsAt") ?? "").trim();
  const publicDetails = String(formData.get("publicDetails") ?? "").trim();
  const privateDetails = String(formData.get("privateDetails") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "public").trim();
  const published = String(formData.get("published") ?? "").trim() === "on";
  const locationPublic = String(formData.get("locationPublic") ?? "").trim();
  const locationPrivate = String(formData.get("locationPrivate") ?? "").trim();
  const locationPublicMapUrl = String(formData.get("locationPublicMapUrl") ?? "").trim();
  const locationPrivateMapUrl = String(formData.get("locationPrivateMapUrl") ?? "").trim();
  const eventTypeId = String(formData.get("eventTypeId") ?? "").trim();
  const managerUserId = String(formData.get("managerUserId") ?? "").trim();
  const returnToRaw = String(formData.get("returnTo") ?? "").trim();
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/admin?section=onice";
  const signupMode = String(formData.get("signupMode") ?? "straight_rsvp").trim();
  const interestClosesAt = String(formData.get("interestClosesAt") ?? "").trim();
  const targetRosterSizeRaw = String(formData.get("targetRosterSize") ?? "").trim();
  const targetRosterSize = Number(targetRosterSizeRaw);
  const heroImageUrl = String(formData.get("heroImageUrl") ?? "").trim();
  const heroImageChoice = String(formData.get("heroImageChoice") ?? "").trim();
  const thumbnailImageUrl = String(formData.get("thumbnailImageUrl") ?? "").trim();
  const thumbnailImageChoice = String(formData.get("thumbnailImageChoice") ?? "").trim();
  const allowGuestRequests = String(formData.get("allowGuestRequests") ?? "").trim() === "on";
  const guestCostEnabled = String(formData.get("guestCostEnabled") ?? "").trim() === "on";
  const guestCostLabel = String(formData.get("guestCostLabel") ?? "").trim();
  const guestCostAmountUsdRaw = String(formData.get("guestCostAmountUsd") ?? "").trim();
  const guestCostAmountUsd = Number(guestCostAmountUsdRaw);

  if (!eventId || !title || !startsAt || !publicDetails) {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "missing_event_fields"), request.url), 303);
  }

  if (!["public", "player_only", "internal"].includes(visibility)) {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "invalid_event_visibility"), request.url), 303);
  }

  try {
    await updateEvent({
      eventId,
      title,
      startsAt,
      publicDetails,
      privateDetails,
      visibility: visibility as "public" | "player_only" | "internal",
      published,
      locationPublic,
      locationPrivate,
      locationPublicMapUrl: locationPublicMapUrl || toGoogleMapsSearchUrl(locationPublic),
      locationPrivateMapUrl: locationPrivateMapUrl || toGoogleMapsSearchUrl(locationPrivate),
      eventTypeId: eventTypeId || undefined,
      managerUserId: managerUserId || undefined
    });
    const eventTypes = await listEventTypes();
    const eventTypeName =
      eventTypes.find((entry) => entry.id === (eventTypeId || ""))?.name || "";
    const guestsAllowedForEventType = allowGuestRequests && !isDvhlEvent(eventTypeName);
    const effectiveSignupMode = isDvhlEvent(eventTypeName) ? "straight_rsvp" : signupMode;
    await upsertEventSignupConfig({
      eventId,
      signupMode: effectiveSignupMode,
      interestClosesAt,
      targetRosterSize: Number.isFinite(targetRosterSize) ? targetRosterSize : undefined,
      heroImageUrl: heroImageUrl || heroImageChoice,
      thumbnailImageUrl: thumbnailImageUrl || thumbnailImageChoice,
      allowGuestRequests: guestsAllowedForEventType,
      guestCostEnabled: guestsAllowedForEventType && guestCostEnabled,
      guestCostLabel,
      guestCostAmountUsd: Number.isFinite(guestCostAmountUsd) ? guestCostAmountUsd : undefined,
      updatedByUserId: actor.id
    });

    return NextResponse.redirect(new URL(withParam(returnTo, "eventupdated", "1"), request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "event_update_failed"), request.url), 303);
  }
}
