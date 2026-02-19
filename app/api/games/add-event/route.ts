import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { addLiveGameEvent } from "@/lib/hq/live-games";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) {
    return NextResponse.redirect(new URL("/login?error=sign_in_required", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const gameId = String(formData.get("gameId") ?? "").trim();
  const period = String(formData.get("period") ?? "").trim();
  const clock = String(formData.get("clock") ?? "").trim();
  const team = String(formData.get("team") ?? "Warriors").trim();
  const eventType = String(formData.get("eventType") ?? "goal").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!gameId || !team || !eventType) {
    return NextResponse.redirect(new URL("/games?error=invalid_live_event_payload", request.url), 303);
  }

  try {
    await addLiveGameEvent({
      actor: {
        id: actor.id,
        role: actor.role,
        status: actor.status
      },
      gameId,
      period,
      clock,
      team,
      eventType,
      note
    });

    return NextResponse.redirect(new URL("/games?event=saved", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/games?error=live_event_save_failed", request.url), 303);
  }
}
