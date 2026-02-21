import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel, userHasPermission } from "@/lib/hq/permissions";
import {
  closeDvhlDraftSession,
  listDvhlSignupIntents,
  getDvhlSeasonPlan,
  upsertDvhlDraftSession
} from "@/lib/hq/dvhl-workflows";
import { listCompetitions, listEligiblePlayers } from "@/lib/hq/competitions";

function withParam(path: string, key: string, value: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}

function shuffled<T>(input: T[]) {
  const next = [...input];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor)) || !(await userHasPermission(actor, "manage_dvhl"))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const competitionId = String(formData.get("competitionId") ?? "").trim();
  const action = String(formData.get("action") ?? "start").trim();
  const returnToRaw = String(formData.get("returnTo") ?? "").trim();
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/admin/dvhl?tab=draft";

  if (!competitionId) {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "missing_competition_id"), request.url), 303);
  }

  try {
    if (action === "close") {
      await closeDvhlDraftSession({
        competitionId,
        updatedByUserId: actor.id
      });
      return NextResponse.redirect(new URL(withParam(returnTo, "dvhl", "draft_closed"), request.url), 303);
    }

    const competitions = await listCompetitions();
    const competition = competitions.find((entry) => entry.id === competitionId && entry.type === "DVHL");
    if (!competition) {
      return NextResponse.redirect(new URL(withParam(returnTo, "error", "dvhl_competition_not_found"), request.url), 303);
    }

    const defaultTeamOrder = competition.teams.map((team) => team.id);
    const plan = await getDvhlSeasonPlan(competitionId);
    const submittedOrder = formData
      .getAll("pickOrderTeamIds")
      .map((entry) => String(entry).trim())
      .filter(Boolean);
    const planTeamOrder =
      plan?.teamOrderStrategy === "random" ? shuffled(defaultTeamOrder) : defaultTeamOrder;
    const teamOrder = submittedOrder.length > 0 ? submittedOrder : planTeamOrder;

    const poolFromMembers = competition.teams.flatMap((team) => team.members.map((member) => member.user.id));
    const submittedPool = formData
      .getAll("poolUserIds")
      .map((entry) => String(entry).trim())
      .filter(Boolean);

    const includeAllEligible = String(formData.get("includeAllEligible") ?? "").trim() === "on";
    const eligiblePlayers = (await listEligiblePlayers()).map((entry) => entry.id);
    const signupPool = (await listDvhlSignupIntents(competitionId)).map((entry) => entry.userId);
    const plannedPoolBase =
      plan?.playerPoolStrategy === "all_eligible"
        ? eligiblePlayers
        : plan?.playerPoolStrategy === "ops_selected"
          ? poolFromMembers
          : signupPool;
    const eligible = includeAllEligible ? eligiblePlayers : [];
    const poolUserIds =
      submittedPool.length > 0
        ? submittedPool
        : Array.from(new Set([...plannedPoolBase, ...poolFromMembers, ...eligible]));
    const draftMode = String(formData.get("draftMode") ?? "").trim() === "snake"
      ? "snake"
      : plan?.draftMode || "manual";
    const rounds = Number(String(formData.get("rounds") ?? "").trim()) || plan?.rounds || 1;

    await upsertDvhlDraftSession({
      competitionId,
      pickOrderTeamIds: teamOrder,
      poolUserIds,
      draftMode,
      rounds,
      updatedByUserId: actor.id
    });

    return NextResponse.redirect(new URL(withParam(returnTo, "dvhl", "draft_started"), request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "dvhl_draft_save_failed"), request.url), 303);
  }
}
