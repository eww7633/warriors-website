import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { saveLiveGameLineup } from "@/lib/hq/live-games";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) {
    return NextResponse.redirect(new URL("/login?error=sign_in_required", request.url), 303);
  }

  const formData = await request.formData();
  const gameId = String(formData.get("gameId") ?? "").trim();
  const selectedUserIds = formData
    .getAll("selectedUserIds")
    .map((entry) => String(entry).trim())
    .filter(Boolean);
  const opponentRoster = String(formData.get("opponentRoster") ?? "").trim();
  const locked = String(formData.get("locked") ?? "").trim() === "on";

  if (!gameId) {
    return NextResponse.redirect(new URL("/games?error=invalid_lineup_payload", request.url), 303);
  }

  try {
    await saveLiveGameLineup({
      actor: {
        id: actor.id,
        role: actor.role,
        status: actor.status
      },
      gameId,
      selectedUserIds,
      opponentRoster,
      locked
    });

    return NextResponse.redirect(new URL("/games?lineup=saved", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/games?error=lineup_save_failed", request.url), 303);
  }
}
