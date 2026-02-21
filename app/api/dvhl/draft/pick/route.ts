import { NextResponse } from "next/server";
import { assignPlayerToCompetitionTeam } from "@/lib/hq/competitions";
import { makeDvhlDraftPick, getDvhlWorkflowContext } from "@/lib/hq/dvhl-workflows";
import { userHasPermission } from "@/lib/hq/permissions";
import { getCurrentUser } from "@/lib/hq/session";

function withParam(path: string, key: string, value: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const competitionId = String(formData.get("competitionId") ?? "").trim();
  const teamId = String(formData.get("teamId") ?? "").trim();
  const userId = String(formData.get("userId") ?? "").trim();
  const returnToRaw = String(formData.get("returnTo") ?? "").trim();
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/admin/dvhl?tab=draft";

  if (!competitionId || !teamId || !userId) {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "missing_draft_pick_fields"), request.url), 303);
  }

  const canManageDvhl = await userHasPermission(actor, "manage_dvhl");
  const { teamControlMap } = await getDvhlWorkflowContext();
  const teamControl = teamControlMap[teamId];
  const isCaptainForTeam = teamControl?.captainUserId === actor.id;

  if (!canManageDvhl && !isCaptainForTeam) {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "draft_pick_not_authorized"), request.url), 303);
  }

  try {
    await makeDvhlDraftPick({
      competitionId,
      teamId,
      userId,
      actorUserId: actor.id
    });
    await assignPlayerToCompetitionTeam({ teamId, userId });
    return NextResponse.redirect(new URL(withParam(returnTo, "dvhl", "draft_pick_saved"), request.url), 303);
  } catch (error) {
    const reason = encodeURIComponent(error instanceof Error ? error.message : "dvhl_draft_pick_failed");
    return NextResponse.redirect(
      new URL(`${withParam(returnTo, "error", "dvhl_draft_pick_failed")}&errorDetail=${reason}`, request.url),
      303
    );
  }
}
