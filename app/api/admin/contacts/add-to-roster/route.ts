import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel, userHasPermission } from "@/lib/hq/permissions";
import { hasDatabaseUrl } from "@/lib/db-env";
import { getPrismaClient } from "@/lib/prisma";
import { findBlockingRosterReservation, upsertRosterReservations } from "@/lib/hq/roster-reservations";
import { readStore } from "@/lib/hq/store";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor)) || !(await userHasPermission(actor, "manage_players"))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  if (!hasDatabaseUrl()) {
    return NextResponse.redirect(new URL("/admin?section=contacts&error=db_required_for_contact_roster", request.url), 303);
  }

  const formData = await request.formData();
  const contactLeadId = String(formData.get("contactLeadId") ?? "").trim();
  const jerseyNumberRaw = String(formData.get("jerseyNumber") ?? "").trim();
  const primarySubRoster = String(formData.get("primarySubRoster") ?? "").trim();

  const jerseyNumber = Number(jerseyNumberRaw);
  if (!contactLeadId || !Number.isFinite(jerseyNumber) || jerseyNumber < 1 || jerseyNumber > 99) {
    return NextResponse.redirect(new URL("/admin?section=contacts&error=invalid_roster_lock_fields", request.url), 303);
  }

  if (!["gold", "white", "black"].includes(primarySubRoster)) {
    return NextResponse.redirect(new URL("/admin?section=contacts&error=primary_sub_roster_required", request.url), 303);
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
      return NextResponse.redirect(new URL("/admin?section=contacts&error=contact_not_found", request.url), 303);
    }

    const fullName = lead.fullName?.trim() || lead.email || `Lead ${lead.id.slice(0, 6)}`;
    const conflict = await findBlockingRosterReservation({
      rosterId: "main-player-roster",
      jerseyNumber,
      candidateEmail: lead.email || undefined,
      candidateFullName: fullName,
      candidateUserId: lead.linkedUserId || undefined
    });

    if (conflict) {
      const url = new URL("/admin?section=contacts&error=reserved_number_conflict", request.url);
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

    return NextResponse.redirect(new URL("/admin?section=contacts&contact=roster_locked", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=contacts&error=contact_roster_lock_failed", request.url), 303);
  }
}
