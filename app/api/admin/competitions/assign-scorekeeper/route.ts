import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { assignGameScorekeeper } from "@/lib/hq/competitions";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "admin") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const gameId = String(formData.get("gameId") ?? "").trim();
  const scorekeeperType = String(formData.get("scorekeeperType") ?? "none").trim();
  const scorekeeperUserId = String(formData.get("scorekeeperUserId") ?? "").trim();
  const scorekeeperStaffId = String(formData.get("scorekeeperStaffId") ?? "").trim();

  if (!gameId) {
    return NextResponse.redirect(new URL("/admin?section=competitions&error=missing_game_id", request.url), 303);
  }

  try {
    await assignGameScorekeeper({
      gameId,
      scorekeeperType: scorekeeperType as "none" | "player" | "staff",
      scorekeeperUserId,
      scorekeeperStaffId
    });

    return NextResponse.redirect(new URL("/admin?section=competitions&scorekeeper=saved", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=competitions&error=scorekeeper_assign_failed", request.url), 303);
  }
}
