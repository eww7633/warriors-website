import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { getPrismaClient } from "@/lib/prisma";
import { markContactLeadInvited } from "@/lib/hq/ops-data";
import { sendInviteEmail } from "@/lib/email";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "admin") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const contactLeadId = String(formData.get("contactLeadId") ?? "").trim();

  if (!contactLeadId) {
    return NextResponse.redirect(new URL("/admin?section=contacts&error=missing_contact_id", request.url), 303);
  }

  try {
    const lead = await getPrismaClient().contactLead.findUnique({
      where: { id: contactLeadId },
      select: { id: true, email: true, fullName: true }
    });

    if (!lead) {
      throw new Error("Contact not found.");
    }

    if (!lead.email) {
      throw new Error("Contact has no email address.");
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pghwarriorhockey.us";
    const registerUrl = `${baseUrl.replace(/\/+$/, "")}/register`;

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
