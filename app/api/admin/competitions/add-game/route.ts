import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { addCompetitionGameForTeam } from "@/lib/hq/competitions";

function withParam(path: string, key: string, value: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const teamId = String(formData.get("teamId") ?? "").trim();
  const opponent = String(formData.get("opponent") ?? "").trim();
  const startsAt = String(formData.get("startsAt") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const scorekeeperType = String(formData.get("scorekeeperType") ?? "none").trim();
  const scorekeeperUserId = String(formData.get("scorekeeperUserId") ?? "").trim();
  const scorekeeperStaffId = String(formData.get("scorekeeperStaffId") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  const target = returnTo.startsWith("/") ? returnTo : "/admin?section=competitions";

  if (!teamId || !opponent) {
    return NextResponse.redirect(new URL(withParam(target, "error", "missing_game_fields"), request.url), 303);
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

    return NextResponse.redirect(new URL(withParam(target, "game", "created"), request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(withParam(target, "error", "game_create_failed"), request.url), 303);
  }
}
