import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { deleteEvent } from "@/lib/hq/events";

export async function POST(request: Request) {
  const actor = await getCurrentUser();

  if (!actor || actor.role !== "admin") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const eventId = String(formData.get("eventId") ?? "").trim();

  if (!eventId) {
    return NextResponse.redirect(new URL("/admin?section=events&error=missing_event_id", request.url), 303);
  }

  try {
    await deleteEvent(eventId);
    return NextResponse.redirect(new URL("/admin?section=events&eventdeleted=1", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=events&error=event_delete_failed", request.url), 303);
  }
}
