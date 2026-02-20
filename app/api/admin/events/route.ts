import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { createEvent, listEventTypes } from "@/lib/hq/events";
import { isDvhlEvent, upsertEventSignupConfig } from "@/lib/hq/event-signups";

export async function POST(request: Request) {
  const actor = await getCurrentUser();

  if (!actor || !canAccessAdminPanel(actor)) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
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
  const signupMode = String(formData.get("signupMode") ?? "straight_rsvp").trim();
  const interestClosesAt = String(formData.get("interestClosesAt") ?? "").trim();
  const targetRosterSizeRaw = String(formData.get("targetRosterSize") ?? "").trim();
  const targetRosterSize = Number(targetRosterSizeRaw);
  const heroImageUrl = String(formData.get("heroImageUrl") ?? "").trim();
  const thumbnailImageUrl = String(formData.get("thumbnailImageUrl") ?? "").trim();
  const allowGuestRequests = String(formData.get("allowGuestRequests") ?? "").trim() === "on";
  const guestCostEnabled = String(formData.get("guestCostEnabled") ?? "").trim() === "on";
  const guestCostLabel = String(formData.get("guestCostLabel") ?? "").trim();
  const guestCostAmountUsdRaw = String(formData.get("guestCostAmountUsd") ?? "").trim();
  const guestCostAmountUsd = Number(guestCostAmountUsdRaw);

  if (!title || !startsAt || !publicDetails) {
    return NextResponse.redirect(new URL("/admin?section=events&error=missing_event_fields", request.url), 303);
  }

  if (!["public", "player_only", "internal"].includes(visibility)) {
    return NextResponse.redirect(new URL("/admin?section=events&error=invalid_event_visibility", request.url), 303);
  }

  try {
    const created = await createEvent({
      title,
      startsAt,
      publicDetails,
      privateDetails,
      visibility: visibility as "public" | "player_only" | "internal",
      published,
      locationPublic,
      locationPrivate,
      locationPublicMapUrl,
      locationPrivateMapUrl,
      eventTypeId: eventTypeId || undefined,
      managerUserId: managerUserId || undefined
    });
    const eventTypes = await listEventTypes();
    const eventTypeName =
      eventTypes.find((entry) => entry.id === (eventTypeId || ""))?.name || "";
    const guestsAllowedForEventType = allowGuestRequests && !isDvhlEvent(eventTypeName);
    await upsertEventSignupConfig({
      eventId: created.id,
      signupMode,
      interestClosesAt,
      targetRosterSize: Number.isFinite(targetRosterSize) ? targetRosterSize : undefined,
      heroImageUrl,
      thumbnailImageUrl,
      allowGuestRequests: guestsAllowedForEventType,
      guestCostEnabled: guestsAllowedForEventType && guestCostEnabled,
      guestCostLabel,
      guestCostAmountUsd: Number.isFinite(guestCostAmountUsd) ? guestCostAmountUsd : undefined,
      updatedByUserId: actor.id
    });

    return NextResponse.redirect(new URL("/admin?section=events&eventsaved=1", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=events&error=event_create_failed", request.url), 303);
  }
}
