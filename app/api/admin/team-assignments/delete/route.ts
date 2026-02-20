import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { deleteTeamAssignment } from "@/lib/hq/player-profiles";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !canAccessAdminPanel(actor)) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const assignmentId = String(formData.get("assignmentId") ?? "").trim();

  if (!assignmentId) {
    return NextResponse.redirect(new URL("/admin/roster?error=missing_assignment_id", request.url), 303);
  }

  try {
    await deleteTeamAssignment(assignmentId);
    return NextResponse.redirect(new URL("/admin/roster?assignmentDeleted=1", request.url), 303);
  } catch (error) {
    const reason = encodeURIComponent(error instanceof Error ? error.message : "assignment_delete_failed");
    return NextResponse.redirect(new URL(`/admin/roster?error=${reason}`, request.url), 303);
  }
}
