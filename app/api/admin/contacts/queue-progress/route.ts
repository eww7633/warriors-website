import { NextResponse } from "next/server";
import { setUserRole } from "@/lib/hq/access";
import { sendInviteEmail } from "@/lib/email";
import {
  getContactLeadById,
  linkContactLeadToMatchingUser,
  markContactLeadInvited
} from "@/lib/hq/ops-data";
import { canAccessAdminPanel, userHasPermission } from "@/lib/hq/permissions";
import {
  findBlockingRosterReservation,
  listRosterReservations,
  upsertRosterReservations
} from "@/lib/hq/roster-reservations";
import { updateCentralRosterPlayer } from "@/lib/hq/roster";
import { upsertPlayerContactProfile } from "@/lib/hq/player-profiles";
import { readStore } from "@/lib/hq/store";
import { getCurrentUser } from "@/lib/hq/session";

function withParam(path: string, key: string, value: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}

function nextAvailableNumber(used: Set<number>) {
  for (let number = 1; number <= 99; number += 1) {
    if (!used.has(number)) return number;
  }
  return null;
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }
  const canManageUsers = await userHasPermission(actor, "manage_site_users");
  const canManagePlayers = await userHasPermission(actor, "manage_players");

  if (!canManageUsers && !canManagePlayers) {
    return NextResponse.redirect(new URL("/admin?section=contacts&error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const returnToRaw = String(formData.get("returnTo") ?? "").trim();
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/admin?section=contacts";
  const action = String(formData.get("action") ?? "invite_link").trim();
  const selected = formData
    .getAll("contactLeadIds")
    .map((entry) => String(entry).trim())
    .filter(Boolean);
  const primarySubRoster = String(formData.get("primarySubRoster") ?? "").trim();

  if (selected.length === 0) {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "bulk_contacts_required"), request.url), 303);
  }

  const enableInvite = action === "invite_link" || action === "full";
  const enablePromote = action === "promote_roster" || action === "full";

  if (enablePromote && !["gold", "white", "black"].includes(primarySubRoster)) {
    return NextResponse.redirect(
      new URL(withParam(returnTo, "error", "primary_sub_roster_required"), request.url),
      303
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pghwarriorhockey.us";
  const registerUrl = `${baseUrl.replace(/\/+$/, "")}/join`;

  const [reservations, store] = await Promise.all([listRosterReservations(), readStore()]);
  const usedNumbers = new Set<number>();
  for (const reservation of reservations) {
    if (reservation.rosterId === "main-player-roster") {
      usedNumbers.add(reservation.jerseyNumber);
    }
  }
  for (const user of store.users) {
    if (
      user.rosterId === "main-player-roster" &&
      Number.isFinite(user.jerseyNumber) &&
      typeof user.jerseyNumber === "number"
    ) {
      usedNumbers.add(user.jerseyNumber);
    }
  }

  let invited = 0;
  let linked = 0;
  let promoted = 0;
  let rostered = 0;
  let skipped = 0;

  for (const contactLeadId of selected) {
    try {
      const lead = await getContactLeadById(contactLeadId);
      if (!lead) {
        skipped += 1;
        continue;
      }

      if (enableInvite && canManageUsers && lead.email && !lead.linkedUserId) {
        try {
          await sendInviteEmail({
            to: lead.email,
            fullName: lead.fullName || undefined,
            registerUrl
          });
          await markContactLeadInvited(lead.id);
          invited += 1;
        } catch {
          // Continue queue processing for this lead.
        }

        try {
          await linkContactLeadToMatchingUser(lead.id);
          linked += 1;
        } catch {
          // Matching account may not exist yet.
        }
      }

      const refreshed = await getContactLeadById(contactLeadId);
      if (!refreshed) {
        skipped += 1;
        continue;
      }

      if (!enablePromote || !canManagePlayers) {
        continue;
      }

      if (!refreshed.linkedUserId) {
        skipped += 1;
        continue;
      }

      const linkedUser = store.users.find((entry) => entry.id === refreshed.linkedUserId);
      if (linkedUser && linkedUser.role === "public") {
        await setUserRole({
          actorUserId: actor.id,
          targetUserId: linkedUser.id,
          role: "player"
        });
        promoted += 1;
      }

      const existingReservation = reservations.find((entry) => {
        if (entry.rosterId !== "main-player-roster") return false;
        if (entry.linkedUserId && entry.linkedUserId === refreshed.linkedUserId) return true;
        if (entry.email && refreshed.email && entry.email === refreshed.email.toLowerCase()) return true;
        return false;
      });

      if (existingReservation) {
        continue;
      }

      const fullName = refreshed.fullName?.trim() || refreshed.email || `Lead ${refreshed.id.slice(0, 6)}`;
      const jerseyNumber = nextAvailableNumber(usedNumbers);
      if (!jerseyNumber) {
        skipped += 1;
        continue;
      }

      const conflict = await findBlockingRosterReservation({
        rosterId: "main-player-roster",
        jerseyNumber,
        candidateEmail: refreshed.email || undefined,
        candidateFullName: fullName,
        candidateUserId: refreshed.linkedUserId || undefined
      });
      if (conflict) {
        skipped += 1;
        continue;
      }

      await upsertRosterReservations(
        [
          {
            fullName,
            email: refreshed.email || undefined,
            phone: refreshed.phone || undefined,
            rosterId: "main-player-roster",
            primarySubRoster: primarySubRoster as "gold" | "white" | "black",
            jerseyNumber,
            notes: refreshed.notes || undefined
          }
        ],
        {
          source: "wix",
          autoLinkUsers: store.users
        }
      );
      usedNumbers.add(jerseyNumber);
      rostered += 1;

      const placement = await updateCentralRosterPlayer({
        userId: refreshed.linkedUserId,
        fullName,
        rosterId: "main-player-roster",
        jerseyNumber,
        activityStatus: "active"
      });
      if (!placement.ok) {
        skipped += 1;
        continue;
      }
      await upsertPlayerContactProfile({
        userId: refreshed.linkedUserId,
        primarySubRoster: primarySubRoster as "gold" | "white" | "black"
      });
    } catch {
      skipped += 1;
    }
  }

  const url = new URL(returnTo, request.url);
  url.searchParams.set("contact", "queue_progress");
  url.searchParams.set("queueInvited", String(invited));
  url.searchParams.set("queueLinked", String(linked));
  url.searchParams.set("queuePromoted", String(promoted));
  url.searchParams.set("queueRostered", String(rostered));
  url.searchParams.set("queueSkipped", String(skipped));
  return NextResponse.redirect(url, 303);
}
