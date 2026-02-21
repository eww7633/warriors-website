import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel, userHasPermission } from "@/lib/hq/permissions";
import { getContactLeadById, markContactLeadInvited } from "@/lib/hq/ops-data";
import { sendInviteEmail } from "@/lib/email";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor)) || !(await userHasPermission(actor, "manage_site_users"))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const lead = await getContactLeadById(params.id);
  if (!lead?.email) {
    return NextResponse.redirect(new URL("/admin?section=contacts&error=contact_email_missing", request.url), 303);
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://pghwarriorhockey.us";
  const registerUrl = `${base}/join?mode=player&invite=1&email=${encodeURIComponent(lead.email)}`;

  try {
    await sendInviteEmail({
      to: lead.email,
      fullName: lead.fullName || undefined,
      registerUrl
    });
    await markContactLeadInvited(lead.id);
    return NextResponse.redirect(new URL("/admin?section=contacts&contact=invite_sent", request.url), 303);
  } catch (error) {
    const reason = encodeURIComponent(error instanceof Error ? error.message : "invite_send_failed");
    return NextResponse.redirect(
      new URL(`/admin?section=contacts&error=invite_send_failed&errorDetail=${reason}`, request.url),
      303
    );
  }
}
