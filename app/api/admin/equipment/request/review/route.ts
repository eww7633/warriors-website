import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { userHasPermission } from "@/lib/hq/permissions";
import { reviewEquipmentRequest } from "@/lib/hq/equipment";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await userHasPermission(actor, "manage_players"))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const requestId = String(formData.get("requestId") ?? "").trim();
  const status = String(formData.get("status") ?? "submitted").trim();
  const reviewNotes = String(formData.get("reviewNotes") ?? "").trim();
  const assignedItemLabel = String(formData.get("assignedItemLabel") ?? "").trim();

  if (!requestId) {
    return NextResponse.redirect(new URL("/admin?section=equipment&error=equipment_request_not_found", request.url), 303);
  }

  try {
    await reviewEquipmentRequest({
      requestId,
      status,
      reviewNotes,
      reviewedByUserId: actor.id,
      assignedItemLabel
    });
    return NextResponse.redirect(new URL("/admin?section=equipment&equipment=request_saved", request.url), 303);
  } catch (error) {
    const reason = encodeURIComponent(error instanceof Error ? error.message : "equipment_request_save_failed");
    return NextResponse.redirect(new URL(`/admin?section=equipment&error=${reason}`, request.url), 303);
  }
}
