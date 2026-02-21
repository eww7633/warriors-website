import { NextResponse } from "next/server";
import {
  getDvhlSeasonPlan,
  listDvhlSignupIntents,
  upsertDvhlSignupIntent
} from "@/lib/hq/dvhl-workflows";
import { getCurrentUser } from "@/lib/hq/session";

function withParam(path: string, key: string, value: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || (actor.role !== "player" && actor.role !== "admin") || actor.status !== "approved") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const competitionId = String(formData.get("competitionId") ?? "").trim();
  const wantsCaptain = String(formData.get("wantsCaptain") ?? "").trim() === "on";
  const note = String(formData.get("note") ?? "").trim();
  const returnToRaw = String(formData.get("returnTo") ?? "").trim();
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/player/dvhl?tab=signup";

  if (!competitionId) {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "missing_competition_id"), request.url), 303);
  }

  const plan = await getDvhlSeasonPlan(competitionId);
  if (plan?.signupClosesAt && new Date(plan.signupClosesAt).getTime() <= Date.now()) {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "signup_window_closed"), request.url), 303);
  }

  try {
    const existing = (await listDvhlSignupIntents(competitionId)).find((entry) => entry.userId === actor.id);
    const captainInterestClosed = Boolean(
      plan?.captainSignupClosesAt && new Date(plan.captainSignupClosesAt).getTime() <= Date.now()
    );
    await upsertDvhlSignupIntent({
      competitionId,
      userId: actor.id,
      wantsCaptain: captainInterestClosed ? Boolean(existing?.wantsCaptain) : wantsCaptain,
      note
    });
    return NextResponse.redirect(new URL(withParam(returnTo, "dvhl", "signup_saved"), request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "dvhl_signup_save_failed"), request.url), 303);
  }
}
