import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { removeCompetitionTeam } from "@/lib/hq/competitions";

function basePath(formData: { get: (name: string) => FormDataEntryValue | null }) {
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  if (returnTo.startsWith("/")) {
    return returnTo;
  }
  return "/admin/dvhl?tab=teams";
}

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
  const target = basePath(formData);

  if (!teamId) {
    return NextResponse.redirect(new URL(withParam(target, "error", "missing_team_id"), request.url), 303);
  }

  try {
    await removeCompetitionTeam({ teamId });
    return NextResponse.redirect(new URL(withParam(target, "dvhl", "team_removed"), request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(withParam(target, "error", "team_remove_failed"), request.url), 303);
  }
}
