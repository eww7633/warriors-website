import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { updateEvent } from "@/lib/hq/events";

export async function POST(request: Request) {
  const actor = await getCurrentUser();

  if (!actor || actor.role !== "admin") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const eventId = String(formData.get("eventId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const startsAt = String(formData.get("startsAt") ?? "").trim();
  const publicDetails = String(formData.get("publicDetails") ?? "").trim();
  const privateDetails = String(formData.get("privateDetails") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "public").trim();
  const published = String(formData.get("published") ?? "").trim() === "on";
  const locationPublic = String(formData.get("locationPublic") ?? "").trim();
  const locationPrivate = String(formData.get("locationPrivate") ?? "").trim();

  if (!eventId || !title || !startsAt || !publicDetails) {
    return NextResponse.redirect(new URL("/admin?section=events&error=missing_event_fields", request.url), 303);
  }

  if (!["public", "player_only", "internal"].includes(visibility)) {
    return NextResponse.redirect(new URL("/admin?section=events&error=invalid_event_visibility", request.url), 303);
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
      locationPrivate
    });

    return NextResponse.redirect(new URL("/admin?section=events&eventupdated=1", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=events&error=event_update_failed", request.url), 303);
  }
}
