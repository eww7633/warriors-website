import { NextResponse } from "next/server";
import { listCompetitions } from "@/lib/hq/competitions";
import { addDvhlSubPoolMember, removeDvhlSubPoolMember } from "@/lib/hq/dvhl";
import { getCurrentUser } from "@/lib/hq/session";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "player" && user.role !== "admin") || user.status !== "approved") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };

  const teamId = String(formData.get("teamId") ?? "").trim();
  const action = String(formData.get("action") ?? "add").trim();
  const returnTo = String(formData.get("returnTo") ?? "/player/dvhl?tab=subs").trim();
  const target = returnTo.startsWith("/") ? returnTo : "/player/dvhl?tab=subs";

  if (!teamId) {
    const sep = target.includes("?") ? "&" : "?";
    return NextResponse.redirect(new URL(`${target}${sep}error=missing_team_id`, request.url), 303);
  }

  const competitions = await listCompetitions();
  const isDvhlTeam = competitions
    .filter((competition) => competition.type === "DVHL")
    .flatMap((competition) => competition.teams)
    .some((team) => team.id === teamId);

  if (!isDvhlTeam) {
    const sep = target.includes("?") ? "&" : "?";
    return NextResponse.redirect(new URL(`${target}${sep}error=invalid_dvhl_team`, request.url), 303);
  }

  try {
    if (action === "remove") {
      await removeDvhlSubPoolMember({ teamId, userId: user.id, updatedByUserId: user.id });
    } else {
      await addDvhlSubPoolMember({ teamId, userId: user.id, updatedByUserId: user.id });
    }

    const sep = target.includes("?") ? "&" : "?";
    return NextResponse.redirect(new URL(`${target}${sep}dvhl=subpool_saved`, request.url), 303);
  } catch {
    const sep = target.includes("?") ? "&" : "?";
    return NextResponse.redirect(new URL(`${target}${sep}error=dvhl_subpool_save_failed`, request.url), 303);
  }
}
