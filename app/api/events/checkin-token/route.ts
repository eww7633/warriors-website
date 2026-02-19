import { NextResponse } from "next/server";
import { createEventCheckInToken } from "@/lib/hq/events";
import { getCurrentUser } from "@/lib/hq/session";

export async function POST(request: Request) {
  const actor = await getCurrentUser();

  if (!actor) {
    return NextResponse.redirect(new URL("/login?error=sign_in_required", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const eventId = String(formData.get("eventId") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "/calendar").trim() || "/calendar";

  if (!eventId) {
    return NextResponse.redirect(new URL(`${returnTo}?error=missing_event_id`, request.url), 303);
  }

  try {
    await createEventCheckInToken({
      eventId,
      actorUserId: actor.id
    });

    return NextResponse.redirect(new URL(`${returnTo}?qr=generated`, request.url), 303);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "qr_generation_failed";
    return NextResponse.redirect(
      new URL(`${returnTo}?error=${encodeURIComponent(errorMessage)}`, request.url),
      303
    );
  }
}
