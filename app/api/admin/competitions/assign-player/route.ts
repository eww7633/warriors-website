import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { assignPlayerToCompetitionTeam } from "@/lib/hq/competitions";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !canAccessAdminPanel(actor)) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const teamId = String(formData.get("teamId") ?? "").trim();
  const userId = String(formData.get("userId") ?? "").trim();

  if (!teamId || !userId) {
    return NextResponse.redirect(new URL("/admin?section=competitions&error=missing_assignment_fields", request.url), 303);
  }

  try {
    await assignPlayerToCompetitionTeam({ teamId, userId });
    return NextResponse.redirect(new URL("/admin?section=competitions&assignment=saved", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=competitions&error=assignment_failed", request.url), 303);
  }
}
