import { NextResponse } from "next/server";
import { createSupporterUser } from "@/lib/hq/store";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel, userHasPermission } from "@/lib/hq/permissions";
import { linkContactLeadToMatchingUser, listSportsData } from "@/lib/hq/ops-data";

function withParam(path: string, key: string, value: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}

function randomTempPassword() {
  return `Warriors-${Math.random().toString(36).slice(2, 10)}!`;
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor)) || !(await userHasPermission(actor, "manage_site_users"))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const returnToRaw = String(formData.get("returnTo") ?? "").trim();
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/admin?section=contacts";

  const data = await listSportsData();
  const leads = data.contactLeads;

  let created = 0;
  let linked = 0;
  let skipped = 0;

  for (const lead of leads) {
    try {
      if (!lead.email) {
        skipped += 1;
        continue;
      }
      if (lead.linkedUserId) {
        linked += 1;
        continue;
      }

      try {
        await linkContactLeadToMatchingUser(lead.id);
        linked += 1;
        continue;
      } catch {
        // no matching user yet
      }

      await createSupporterUser({
        fullName: lead.fullName?.trim() || lead.email,
        email: lead.email,
        password: randomTempPassword(),
        phone: lead.phone || undefined
      });
      await linkContactLeadToMatchingUser(lead.id);
      created += 1;
    } catch {
      skipped += 1;
    }
  }

  const url = new URL(returnTo, request.url);
  url.searchParams.set("contact", "supporters_provisioned");
  url.searchParams.set("usersCreated", String(created));
  url.searchParams.set("usersLinked", String(linked));
  url.searchParams.set("usersSkipped", String(skipped));
  return NextResponse.redirect(url, 303);
}

