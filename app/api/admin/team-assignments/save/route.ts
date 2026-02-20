import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { upsertTeamAssignment } from "@/lib/hq/player-profiles";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !canAccessAdminPanel(actor)) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };

  const userId = String(formData.get("userId") ?? "").trim();
  const assignmentId = String(formData.get("assignmentId") ?? "").trim();
  const assignmentType = String(formData.get("assignmentType") ?? "").trim();
  const seasonLabel = String(formData.get("seasonLabel") ?? "").trim();
  const sessionLabel = String(formData.get("sessionLabel") ?? "").trim();
  const subRosterLabel = String(formData.get("subRosterLabel") ?? "").trim();
  const teamName = String(formData.get("teamName") ?? "").trim();
  const startsAt = String(formData.get("startsAt") ?? "").trim();
  const endsAt = String(formData.get("endsAt") ?? "").trim();
  const status = String(formData.get("status") ?? "active").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!userId) {
    return NextResponse.redirect(new URL("/admin/roster?error=missing_assignment_user", request.url), 303);
  }

  try {
    await upsertTeamAssignment({
      assignmentId: assignmentId || undefined,
      userId,
      assignmentType,
      seasonLabel,
      sessionLabel,
      subRosterLabel,
      teamName,
      startsAt,
      endsAt,
      status: status === "inactive" ? "inactive" : "active",
      notes
    });
    return NextResponse.redirect(new URL("/admin/roster?saved=1", request.url), 303);
  } catch (error) {
    const reason = encodeURIComponent(error instanceof Error ? error.message : "assignment_save_failed");
    return NextResponse.redirect(new URL(`/admin/roster?error=${reason}`, request.url), 303);
  }
}
