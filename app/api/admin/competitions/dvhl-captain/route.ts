import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { setDvhlTeamCaptain } from "@/lib/hq/dvhl";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };

  const teamId = String(formData.get("teamId") ?? "").trim();
  const captainUserId = String(formData.get("captainUserId") ?? "").trim();

  if (!teamId) {
    return NextResponse.redirect(new URL("/admin?section=competitions&error=missing_team_id", request.url), 303);
  }

  try {
    await setDvhlTeamCaptain({
      teamId,
      captainUserId: captainUserId || undefined,
      updatedByUserId: actor.id
    });

    return NextResponse.redirect(new URL("/admin?section=competitions&dvhl=captain_saved", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=competitions&error=dvhl_captain_save_failed", request.url), 303);
  }
}
