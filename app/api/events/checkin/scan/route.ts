import { NextResponse } from "next/server";
import { completeQrCheckIn } from "@/lib/hq/events";
import { getCurrentUser } from "@/lib/hq/session";
import { enqueueMobilePushTrigger } from "@/lib/hq/mobile-push";

export async function POST(request: Request) {
  const actor = await getCurrentUser();

  if (!actor) {
    return NextResponse.redirect(new URL("/login?error=sign_in_required", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const token = String(formData.get("token") ?? "").trim();

  if (!token) {
    return NextResponse.redirect(new URL("/check-in/scan?error=missing_token", request.url), 303);
  }

  try {
    const result = await completeQrCheckIn({ token, userId: actor.id });
    try {
      await enqueueMobilePushTrigger({
        type: "checkin_completed",
        actorUserId: actor.id,
        targetUserId: actor.id,
        eventId: result.eventId,
        title: "Check-in recorded",
        body: `${actor.fullName} completed event check-in.`,
        payload: {
          channel: "web",
          tokenType: "qr"
        }
      });
    } catch {}
    return NextResponse.redirect(new URL("/check-in/scan?checkedIn=1", request.url), 303);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "qr_check_in_failed";
    return NextResponse.redirect(
      new URL(`/check-in/scan?error=${encodeURIComponent(errorMessage)}&token=${encodeURIComponent(token)}`, request.url),
      303
    );
  }
}
