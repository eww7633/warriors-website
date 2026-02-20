import { NextResponse } from "next/server";
import { replaceDvhlSchedule } from "@/lib/hq/competitions";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { getCurrentUser } from "@/lib/hq/session";

function withParam(path: string, key: string, value: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}

function asText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const competitionId = asText(formData, "competitionId");
  const returnToRaw = asText(formData, "returnTo");
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/admin/dvhl?tab=schedule";
  const clearExisting = asText(formData, "clearExisting") === "on";

  if (!competitionId) {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "missing_competition_id"), request.url), 303);
  }

  const weeks = Array.from({ length: 6 }, (_, index) => {
    const weekNumber = index + 1;
    const game1 = {
      homeTeamId: asText(formData, `w${weekNumber}g1Home`),
      awayTeamId: asText(formData, `w${weekNumber}g1Away`),
      startsAt: asText(formData, `w${weekNumber}g1StartsAt`),
      location: asText(formData, `w${weekNumber}g1Location`)
    };
    const game2 = {
      homeTeamId: asText(formData, `w${weekNumber}g2Home`),
      awayTeamId: asText(formData, `w${weekNumber}g2Away`),
      startsAt: asText(formData, `w${weekNumber}g2StartsAt`),
      location: asText(formData, `w${weekNumber}g2Location`)
    };

    return {
      weekNumber,
      games: [game1, game2]
    };
  });

  try {
    await replaceDvhlSchedule({
      competitionId,
      clearExisting,
      weeks
    });
    return NextResponse.redirect(new URL(withParam(returnTo, "dvhl", "schedule_saved"), request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "dvhl_schedule_save_failed"), request.url), 303);
  }
}
