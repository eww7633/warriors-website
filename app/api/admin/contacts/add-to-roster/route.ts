import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel, userHasPermission } from "@/lib/hq/permissions";
import { hasDatabaseUrl } from "@/lib/db-env";
import { getPrismaClient } from "@/lib/prisma";
import {
  findBlockingRosterReservation,
  listRosterReservations,
  upsertRosterReservations
} from "@/lib/hq/roster-reservations";
import { readStore } from "@/lib/hq/store";

function nextAvailableNumber(used: Set<number>) {
  for (let number = 1; number <= 99; number += 1) {
    if (!used.has(number)) {
      return number;
    }
  }
  return null;
}

function withParam(path: string, key: string, value: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor)) || !(await userHasPermission(actor, "manage_players"))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const returnToRaw = String(formData.get("returnTo") ?? "").trim();
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/admin?section=contacts";
  const contactLeadId = String(formData.get("contactLeadId") ?? "").trim();
  const jerseyNumberRaw = String(formData.get("jerseyNumber") ?? "").trim();
  const primarySubRoster = String(formData.get("primarySubRoster") ?? "").trim();
  const requestedNumber = Number(jerseyNumberRaw);
  const hasManualNumber = Number.isFinite(requestedNumber) && requestedNumber >= 1 && requestedNumber <= 99;

  if (!hasDatabaseUrl()) {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "db_required_for_contact_roster"), request.url), 303);
  }

  if (!contactLeadId) {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "invalid_roster_lock_fields"), request.url), 303);
  }
  if (jerseyNumberRaw && !hasManualNumber) {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "invalid_roster_lock_fields"), request.url), 303);
  }

  if (!["gold", "white", "black"].includes(primarySubRoster)) {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "primary_sub_roster_required"), request.url), 303);
  }

  try {
    const lead = await getPrismaClient().contactLead.findUnique({
      where: { id: contactLeadId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        notes: true,
        linkedUserId: true,
        onboardingStatus: true
      }
    });

    if (!lead) {
      return NextResponse.redirect(new URL(withParam(returnTo, "error", "contact_not_found"), request.url), 303);
    }

    const fullName = lead.fullName?.trim() || lead.email || `Lead ${lead.id.slice(0, 6)}`;
    const rosterId = "main-player-roster";
    let jerseyNumber = hasManualNumber ? requestedNumber : NaN;

    if (!hasManualNumber) {
      const [reservations, store] = await Promise.all([listRosterReservations(), readStore()]);
      const used = new Set<number>();
      for (const reservation of reservations) {
        if (reservation.rosterId === rosterId) {
          used.add(reservation.jerseyNumber);
        }
      }
      for (const user of store.users) {
        if (
          user.rosterId === rosterId &&
          Number.isFinite(user.jerseyNumber) &&
          typeof user.jerseyNumber === "number"
        ) {
          used.add(user.jerseyNumber);
        }
      }
      const auto = nextAvailableNumber(used);
      if (!auto) {
        return NextResponse.redirect(
          new URL(withParam(returnTo, "error", "no_available_jersey_numbers"), request.url),
          303
        );
      }
      jerseyNumber = auto;
    }

    const conflict = await findBlockingRosterReservation({
      rosterId,
      jerseyNumber,
      candidateEmail: lead.email || undefined,
      candidateFullName: fullName,
      candidateUserId: lead.linkedUserId || undefined
    });

    if (conflict) {
      const url = new URL(returnTo, request.url);
      url.searchParams.set("error", "reserved_number_conflict");
      url.searchParams.set("errorDetail", encodeURIComponent(`${conflict.fullName} already has #${conflict.jerseyNumber}`));
      return NextResponse.redirect(url, 303);
    }

    const store = await readStore();
    await upsertRosterReservations(
      [
        {
          fullName,
          email: lead.email || undefined,
          phone: lead.phone || undefined,
          rosterId,
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

    return NextResponse.redirect(new URL(withParam(returnTo, "contact", "roster_locked"), request.url), 303);
  } catch {
    return NextResponse.redirect(new URL(withParam(returnTo, "error", "contact_roster_lock_failed"), request.url), 303);
  }
}
