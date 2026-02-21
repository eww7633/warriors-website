import { NextResponse } from "next/server";
import { hasDatabaseUrl } from "@/lib/db-env";
import { sendInviteEmail } from "@/lib/email";
import { canAccessAdminPanel, userHasPermission } from "@/lib/hq/permissions";
import { upsertPlayerContactProfile } from "@/lib/hq/player-profiles";
import {
  getContactLeadById,
  linkContactLeadToMatchingUser,
  listSportsData,
  markContactLeadInvited
} from "@/lib/hq/ops-data";
import { getCurrentUser } from "@/lib/hq/session";
import { createSupporterUser, readStore, writeStore } from "@/lib/hq/store";
import { getPrismaClient } from "@/lib/prisma";

function getReturnPath(raw: string) {
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/admin?section=contacts";
  }
  return value;
}

function appendCount(path: string, key: string, value: number) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(String(value))}`;
}

function randomPassword() {
  return `Tmp-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

type QueueAction = "invite" | "link" | "provision" | "roster";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor)) || !(await userHasPermission(actor, "manage_site_users"))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const action = String(formData.get("action") ?? "").trim() as QueueAction;
  const returnTo = getReturnPath(String(formData.get("returnTo") ?? "/admin?section=contacts"));
  const leadIds = formData.getAll("leadIds").map((entry) => String(entry).trim()).filter(Boolean);
  const rosterId = String(formData.get("rosterId") ?? "main-player-roster").trim() || "main-player-roster";
  const primarySubRoster = String(formData.get("primarySubRoster") ?? "").trim();

  if (!["invite", "link", "provision", "roster"].includes(action)) {
    return NextResponse.redirect(new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=queue_action_required`, request.url), 303);
  }
  if (leadIds.length === 0) {
    return NextResponse.redirect(new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=queue_selection_required`, request.url), 303);
  }
  if (action === "roster" && !["gold", "white", "black"].includes(primarySubRoster)) {
    return NextResponse.redirect(new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=primary_sub_roster_required`, request.url), 303);
  }

  const data = await listSportsData();
  const leadSet = new Set(leadIds);
  const selectedLeads = data.contactLeads.filter((entry) => leadSet.has(entry.id));

  let invited = 0;
  let linked = 0;
  let provisioned = 0;
  let promoted = 0;
  let rostered = 0;
  let skipped = 0;

  const siteBase = process.env.NEXT_PUBLIC_SITE_URL || "https://pghwarriorhockey.us";

  for (const lead of selectedLeads) {
    try {
      if (action === "invite") {
        if (!lead.email) {
          skipped += 1;
          continue;
        }
        const registerUrl = `${siteBase}/join?mode=player&invite=1&email=${encodeURIComponent(lead.email)}`;
        await sendInviteEmail({
          to: lead.email,
          fullName: lead.fullName || undefined,
          registerUrl
        });
        await markContactLeadInvited(lead.id);
        invited += 1;
        continue;
      }

      if (action === "link") {
        await linkContactLeadToMatchingUser(lead.id);
        linked += 1;
        continue;
      }

      if (action === "provision") {
        if (!lead.email || !lead.fullName) {
          skipped += 1;
          continue;
        }
        const existingUser =
          lead.linkedUser ||
          (hasDatabaseUrl()
            ? await getPrismaClient().user.findUnique({
                where: { email: lead.email.toLowerCase() },
                select: { id: true, fullName: true, email: true, role: true, status: true }
              })
            : (await readStore()).users.find((entry) => entry.email.toLowerCase() === lead.email!.toLowerCase()) || null);

        if (!existingUser) {
          await createSupporterUser({
            fullName: lead.fullName,
            email: lead.email,
            password: randomPassword(),
            phone: lead.phone || undefined
          });
          provisioned += 1;
        }
        await linkContactLeadToMatchingUser(lead.id);
        linked += 1;
        continue;
      }

      if (action === "roster") {
        if (!lead.email) {
          skipped += 1;
          continue;
        }
        if (!lead.linkedUserId) {
          await linkContactLeadToMatchingUser(lead.id);
          linked += 1;
        }

        const linkedUserId = hasDatabaseUrl()
          ? (await getPrismaClient().contactLead.findUnique({
              where: { id: lead.id },
              select: { linkedUserId: true }
            }))?.linkedUserId
          : (await getContactLeadById(lead.id))?.linkedUserId;

        if (!linkedUserId) {
          skipped += 1;
          continue;
        }

        if (hasDatabaseUrl()) {
          await getPrismaClient().user.update({
            where: { id: linkedUserId },
            data: {
              role: "player",
              status: "approved",
              activityStatus: "active",
              rosterId
            }
          });
        } else {
          const store = await readStore();
          const user = store.users.find((entry) => entry.id === linkedUserId);
          if (!user) {
            skipped += 1;
            continue;
          }
          user.role = "player";
          user.status = "approved";
          user.activityStatus = "active";
          user.rosterId = rosterId;
          user.updatedAt = new Date().toISOString();
          await writeStore(store);
        }
        promoted += 1;
        await upsertPlayerContactProfile({
          userId: linkedUserId,
          primarySubRoster: primarySubRoster as "gold" | "white" | "black"
        });
        rostered += 1;
      }
    } catch {
      skipped += 1;
    }
  }

  let next = returnTo;
  next = appendCount(next, "queueInvited", invited);
  next = appendCount(next, "queueLinked", linked);
  next = appendCount(next, "queueProvisioned", provisioned);
  next = appendCount(next, "queuePromoted", promoted);
  next = appendCount(next, "queueRostered", rostered);
  next = appendCount(next, "queueSkipped", skipped);
  return NextResponse.redirect(new URL(next, request.url), 303);
}
