import { NextResponse } from "next/server";
import { canAccessAdminPanel, userHasPermission } from "@/lib/hq/permissions";
import { getCurrentUser } from "@/lib/hq/session";
import { listCompetitions } from "@/lib/hq/competitions";
import { upsertTeamAssignment } from "@/lib/hq/player-profiles";

function withParam(path: string, key: string, value: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}

function assignmentTypeForCompetition(type: string) {
  if (type === "DVHL") return "dvhl";
  if (type === "TOURNAMENT") return "tournament";
  return "on_ice";
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor)) || !(await userHasPermission(actor, "manage_players"))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const userId = String(formData.get("userId") ?? "").trim();
  const teamId = String(formData.get("teamId") ?? "").trim();
  const status = String(formData.get("status") ?? "active").trim() === "inactive" ? "inactive" : "active";
  const returnToRaw = String(formData.get("returnTo") ?? "").trim();
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/admin/roster";

  if (!userId || !teamId) {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "missing_assignment_fields"), request.url), 303);
  }

  try {
    const competitions = await listCompetitions();
    const competition = competitions.find((entry) => entry.teams.some((team) => team.id === teamId));
    const team = competition?.teams.find((entry) => entry.id === teamId);

    if (!competition || !team) {
      return NextResponse.redirect(new URL(withParam(returnTo, "error", "competition_team_not_found"), request.url), 303);
    }

    await upsertTeamAssignment({
      userId,
      assignmentType: assignmentTypeForCompetition(competition.type),
      seasonLabel: competition.title,
      sessionLabel: competition.type === "DVHL" ? competition.title : undefined,
      subRosterLabel: competition.type === "DVHL" ? "DVHL" : competition.type === "TOURNAMENT" ? "Tournament" : "On-Ice",
      teamName: team.name,
      startsAt: competition.startsAt ? new Date(competition.startsAt).toISOString() : undefined,
      endsAt: undefined,
      status,
      notes: "Quick-assigned from competition team."
    });

    return NextResponse.redirect(new URL(withParam(returnTo, "saved", "1"), request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "quick_assignment_failed"), request.url), 303);
  }
}
