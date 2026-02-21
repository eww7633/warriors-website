import { NextResponse } from "next/server";
import { setDvhlTeamCaptain } from "@/lib/hq/dvhl";
import { listDvhlSignupIntents, upsertDvhlSeasonPlan } from "@/lib/hq/dvhl-workflows";
import { userHasPermission } from "@/lib/hq/permissions";
import { getCurrentUser } from "@/lib/hq/session";

function withParam(path: string, key: string, value: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await userHasPermission(actor, "manage_dvhl"))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const action = String(formData.get("action") ?? "save_plan").trim();
  const competitionId = String(formData.get("competitionId") ?? "").trim();
  const returnToRaw = String(formData.get("returnTo") ?? "").trim();
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/admin/dvhl?tab=draft";

  if (!competitionId) {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "missing_competition_id"), request.url), 303);
  }

  try {
    if (action === "assign_captains") {
      const teamIds = formData
        .getAll("teamIds")
        .map((entry) => String(entry).trim())
        .filter(Boolean);
      const captainUserIds = formData
        .getAll("captainUserIds")
        .map((entry) => String(entry).trim());
      for (let index = 0; index < teamIds.length; index += 1) {
        await setDvhlTeamCaptain({
          teamId: teamIds[index],
          captainUserId: captainUserIds[index] || undefined,
          updatedByUserId: actor.id
        });
      }
      return NextResponse.redirect(new URL(withParam(returnTo, "dvhl", "captains_assigned"), request.url), 303);
    }

    if (action === "seed_pool_from_signups") {
      const signups = await listDvhlSignupIntents(competitionId);
      const poolUserIds = Array.from(new Set(signups.map((entry) => entry.userId)));
      return NextResponse.redirect(
        new URL(
          `${withParam(returnTo, "dvhl", "pool_seeded")}&seedPool=${encodeURIComponent(poolUserIds.join(","))}`,
          request.url
        ),
        303
      );
    }

    const signupClosesAt = String(formData.get("signupClosesAt") ?? "").trim();
    const captainSignupClosesAt = String(formData.get("captainSignupClosesAt") ?? "").trim();
    const desiredCaptainCount = Number(String(formData.get("desiredCaptainCount") ?? "4").trim());
    const rounds = Number(String(formData.get("rounds") ?? "1").trim());
    const draftMode = String(formData.get("draftMode") ?? "manual").trim() === "snake" ? "snake" : "manual";
    const teamOrderStrategy =
      String(formData.get("teamOrderStrategy") ?? "manual").trim() === "random"
        ? "random"
        : "manual";
    const playerPoolStrategyRaw = String(formData.get("playerPoolStrategy") ?? "all_signups").trim();
    const playerPoolStrategy =
      playerPoolStrategyRaw === "all_eligible" || playerPoolStrategyRaw === "ops_selected"
        ? playerPoolStrategyRaw
        : "all_signups";

    await upsertDvhlSeasonPlan({
      competitionId,
      signupClosesAt,
      captainSignupClosesAt,
      desiredCaptainCount: Number.isFinite(desiredCaptainCount) ? desiredCaptainCount : 4,
      rounds: Number.isFinite(rounds) ? rounds : 1,
      teamOrderStrategy,
      playerPoolStrategy,
      draftMode,
      updatedByUserId: actor.id
    });
    return NextResponse.redirect(new URL(withParam(returnTo, "dvhl", "plan_saved"), request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "dvhl_plan_save_failed"), request.url), 303);
  }
}
