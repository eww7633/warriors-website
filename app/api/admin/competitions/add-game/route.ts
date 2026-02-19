import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { addCompetitionGameForTeam } from "@/lib/hq/competitions";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "admin") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const teamId = String(formData.get("teamId") ?? "").trim();
  const opponent = String(formData.get("opponent") ?? "").trim();
  const startsAt = String(formData.get("startsAt") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const scorekeeperType = String(formData.get("scorekeeperType") ?? "none").trim();
  const scorekeeperUserId = String(formData.get("scorekeeperUserId") ?? "").trim();
  const scorekeeperStaffId = String(formData.get("scorekeeperStaffId") ?? "").trim();

  if (!teamId || !opponent) {
    return NextResponse.redirect(new URL("/admin?section=competitions&error=missing_game_fields", request.url), 303);
  }

  try {
    await addCompetitionGameForTeam({
      teamId,
      opponent,
      startsAt,
      location,
      notes,
      scorekeeperUserId: scorekeeperType === "player" ? scorekeeperUserId : undefined,
      scorekeeperStaffId: scorekeeperType === "staff" ? scorekeeperStaffId : undefined
    });

    return NextResponse.redirect(new URL("/admin?section=competitions&game=created", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=competitions&error=game_create_failed", request.url), 303);
  }
}
