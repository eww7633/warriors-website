import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { getContactLeadById, markContactLeadInvited } from "@/lib/hq/ops-data";
import { sendInviteEmail } from "@/lib/email";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const contactLeadId = String(formData.get("contactLeadId") ?? "").trim();

  if (!contactLeadId) {
    return NextResponse.redirect(new URL("/admin?section=contacts&error=missing_contact_id", request.url), 303);
  }

  try {
    const lead = await getContactLeadById(contactLeadId);

    if (!lead) {
      throw new Error("Contact not found.");
    }

    if (!lead.email) {
      throw new Error("Contact has no email address.");
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pghwarriorhockey.us";
    const params = new URLSearchParams({
      mode: "player",
      email: lead.email,
      invite: "1"
    });
    const registerUrl = `${baseUrl.replace(/\/+$/, "")}/join?${params.toString()}`;

    await sendInviteEmail({
      to: lead.email,
      fullName: lead.fullName,
      registerUrl
    });

    await markContactLeadInvited(lead.id);

    return NextResponse.redirect(new URL("/admin?section=contacts&contact=invite_sent", request.url), 303);
  } catch (error) {
    const reason = encodeURIComponent(
      error instanceof Error ? error.message : "Unable to send invite."
    );

    return NextResponse.redirect(
      new URL(`/admin?section=contacts&error=invite_send_failed&errorDetail=${reason}`, request.url),
      303
    );
  }
}
