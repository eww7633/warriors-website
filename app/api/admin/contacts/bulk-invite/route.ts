import { NextResponse } from "next/server";
import { canAccessAdminPanel, userHasPermission } from "@/lib/hq/permissions";
import { getCurrentUser } from "@/lib/hq/session";
import { getContactLeadById, markContactLeadInvited } from "@/lib/hq/ops-data";
import { sendInviteEmail } from "@/lib/email";

function withParam(path: string, key: string, value: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor)) || !(await userHasPermission(actor, "manage_site_users"))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const selected = formData
    .getAll("contactLeadIds")
    .map((entry) => String(entry).trim())
    .filter(Boolean);
  const returnToRaw = String(formData.get("returnTo") ?? "").trim();
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/admin?section=contacts";

  if (selected.length === 0) {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "bulk_contacts_required"), request.url), 303);
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pghwarriorhockey.us";
  const registerUrl = `${baseUrl.replace(/\/+$/, "")}/join`;

  let invited = 0;
  let skipped = 0;
  for (const contactLeadId of selected) {
    try {
      const lead = await getContactLeadById(contactLeadId);
      if (!lead?.email) {
        skipped += 1;
        continue;
      }
      await sendInviteEmail({
        to: lead.email,
        fullName: lead.fullName || undefined,
        registerUrl
      });
      await markContactLeadInvited(lead.id);
      invited += 1;
    } catch {
      skipped += 1;
    }
  }

  const url = new URL(returnTo, request.url);
  url.searchParams.set("contact", "bulk_invited");
  url.searchParams.set("bulkInvited", String(invited));
  url.searchParams.set("bulkSkipped", String(skipped));
  return NextResponse.redirect(url, 303);
}

