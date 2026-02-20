import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel, userHasPermission } from "@/lib/hq/permissions";
import { updateDonationIntentStatus } from "@/lib/hq/donations";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor)) || !(await userHasPermission(actor, "manage_fundraising"))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!id || !["new", "contacted", "processed"].includes(status)) {
    return NextResponse.redirect(new URL("/admin?section=fundraising&error=invalid_donation_status", request.url), 303);
  }

  try {
    await updateDonationIntentStatus({
      id,
      status: status as "new" | "contacted" | "processed",
      updatedByUserId: actor.id
    });
    return NextResponse.redirect(new URL("/admin?section=fundraising&donation=saved", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=fundraising&error=donation_update_failed", request.url), 303);
  }
}
