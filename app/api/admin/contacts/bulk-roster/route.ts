import { NextResponse } from "next/server";
import { canAccessAdminPanel, upsertUserOpsRole, userHasPermission } from "@/lib/hq/permissions";
import { getCurrentUser } from "@/lib/hq/session";
import { setUserRole } from "@/lib/hq/access";
import { getContactLeadById } from "@/lib/hq/ops-data";
import { updateCentralRosterPlayer } from "@/lib/hq/roster";
import {
  findBlockingRosterReservation,
  listRosterReservations,
  upsertRosterReservations
} from "@/lib/hq/roster-reservations";
import { upsertPlayerContactProfile } from "@/lib/hq/player-profiles";
import { readStore } from "@/lib/hq/store";

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
  if (!actor || !(await canAccessAdminPanel(actor)) || !(await userHasPermission(actor, "manage_players"))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const returnToRaw = String(formData.get("returnTo") ?? "").trim();
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/admin?section=contacts";
  const selected = formData
    .getAll("contactLeadIds")
    .map((entry) => String(entry).trim())
    .filter(Boolean);
  const primarySubRoster = String(formData.get("primarySubRoster") ?? "").trim();
  const roleKey = String(formData.get("roleKey") ?? "").trim();

  if (selected.length === 0) {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "bulk_contacts_required"), request.url), 303);
  }
  if (!["gold", "white", "black"].includes(primarySubRoster)) {
    return NextResponse.redirect(
      new URL(withParam(returnTo, "error", "primary_sub_roster_required"), request.url),
      303
    );
  }

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

  let locked = 0;
  let skipped = 0;
  let rolesAssigned = 0;

  for (const contactLeadId of selected) {
    const lead = await getContactLeadById(contactLeadId);
    if (!lead) {
      skipped += 1;
      continue;
    }

    const fullName = lead.fullName?.trim() || lead.email || `Lead ${lead.id.slice(0, 6)}`;
    const jerseyNumber = nextAvailableNumber(usedNumbers);
    if (!jerseyNumber) {
      skipped += 1;
      continue;
    }

    const conflict = await findBlockingRosterReservation({
      rosterId: "main-player-roster",
      jerseyNumber,
      candidateEmail: lead.email || undefined,
      candidateFullName: fullName,
      candidateUserId: lead.linkedUserId || undefined
    });
    if (conflict) {
      skipped += 1;
      continue;
    }

    await upsertRosterReservations(
      [
        {
          fullName,
          email: lead.email || undefined,
          phone: lead.phone || undefined,
          rosterId: "main-player-roster",
          primarySubRoster: primarySubRoster as "gold" | "white" | "black",
          jerseyNumber,
          notes: lead.notes || undefined
        }
      ],
      {
        source: "wix",
        autoLinkUsers: store.users
      }
    );
    usedNumbers.add(jerseyNumber);
    locked += 1;

    if (lead.linkedUserId) {
      const linked = store.users.find((entry) => entry.id === lead.linkedUserId);
      if (linked?.role === "public") {
        await setUserRole({
          actorUserId: actor.id,
          targetUserId: linked.id,
          role: "player"
        });
      }

      const placement = await updateCentralRosterPlayer({
        userId: lead.linkedUserId,
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
        userId: lead.linkedUserId,
        primarySubRoster: primarySubRoster as "gold" | "white" | "black"
      });
    }

    if (lead.linkedUserId && roleKey) {
      try {
        if (roleKey !== "super_admin" || (await userHasPermission(actor, "assign_ops_roles"))) {
          await upsertUserOpsRole({
            actorUserId: actor.id,
            targetUserId: lead.linkedUserId,
            roleKey: roleKey as
              | "super_admin"
              | "president"
              | "vp_hockey_ops"
              | "general_manager"
              | "assistant_general_manager"
              | "equipment_manager"
              | "technology_manager"
              | "dvhl_manager"
              | "media_manager"
          });
          rolesAssigned += 1;
        }
      } catch {
        // Continue bulk processing even if a role assignment fails for one contact.
      }
    }
  }

  const url = new URL(returnTo, request.url);
  url.searchParams.set("contact", "bulk_roster_locked");
  url.searchParams.set("bulkLocked", String(locked));
  url.searchParams.set("bulkSkipped", String(skipped));
  url.searchParams.set("bulkRoles", String(rolesAssigned));
  return NextResponse.redirect(url, 303);
}
