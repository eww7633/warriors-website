import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { updateLiveGameScore } from "@/lib/hq/live-games";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) {
    return NextResponse.redirect(new URL("/login?error=sign_in_required", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const gameId = String(formData.get("gameId") ?? "").trim();
  const warriorsScore = Number(formData.get("warriorsScore") ?? 0);
  const opponentScore = Number(formData.get("opponentScore") ?? 0);
  const period = String(formData.get("period") ?? "P1").trim();
  const clock = String(formData.get("clock") ?? "").trim();
  const liveStatus = String(formData.get("liveStatus") ?? "scheduled").trim();

  if (!gameId || Number.isNaN(warriorsScore) || Number.isNaN(opponentScore)) {
    return NextResponse.redirect(new URL("/games?error=invalid_score_payload", request.url), 303);
  }

  try {
    await updateLiveGameScore({
      actor: {
        id: actor.id,
        role: actor.role,
        status: actor.status
      },
      gameId,
      warriorsScore,
      opponentScore,
      period,
      clock,
      liveStatus
    });

    return NextResponse.redirect(new URL("/games?score=saved", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/games?error=score_update_failed", request.url), 303);
  }
}
