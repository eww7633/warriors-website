import { NextResponse } from "next/server";
import { approvePlayer } from "@/lib/hq/store";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { getPlayerProfileExtra, upsertPlayerContactProfile } from "@/lib/hq/player-profiles";
import { findBlockingRosterReservation, linkMatchingReservationForUser } from "@/lib/hq/roster-reservations";
import { readStore } from "@/lib/hq/store";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const actor = await getCurrentUser();

  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const rosterId = String(formData.get("rosterId") ?? "").trim();
  const jerseyNumberRaw = String(formData.get("jerseyNumber") ?? "").trim();
  const primarySubRoster = String(formData.get("primarySubRoster") ?? "").trim();
  const allowCrossColorJerseyOverlap =
    String(formData.get("allowCrossColorJerseyOverlap") ?? "").trim() === "on";
  const jerseyNumber = jerseyNumberRaw ? Number(jerseyNumberRaw) : undefined;

  if (
    !rosterId ||
    (jerseyNumberRaw &&
      (!Number.isFinite(jerseyNumber) || Number(jerseyNumber) <= 0 || Number(jerseyNumber) > 99))
  ) {
    return NextResponse.redirect(new URL("/admin?section=players&error=invalid_approval_fields", request.url), 303);
  }

  try {
    const store = await readStore();
    const candidate = store.users.find((entry) => entry.id === params.id);
    if (!candidate) {
      return NextResponse.redirect(new URL("/admin?section=players&error=approval_failed", request.url), 303);
    }

    if (typeof jerseyNumber === "number") {
      const reservationConflict = await findBlockingRosterReservation({
        rosterId,
        jerseyNumber,
        candidateUserId: candidate.id,
        candidateEmail: candidate.email,
        candidateFullName: candidate.fullName
      });
      if (reservationConflict) {
        const conflictUrl = new URL("/admin?section=players&error=reserved_number_conflict", request.url);
        conflictUrl.searchParams.set("errorDetail", encodeURIComponent(`${reservationConflict.fullName} owns #${reservationConflict.jerseyNumber} (${reservationConflict.rosterId}) in imported reservations.`));
        return NextResponse.redirect(conflictUrl, 303);
      }
    }

    await approvePlayer(params.id, rosterId, jerseyNumber);
    await upsertPlayerContactProfile({
      userId: params.id,
      primarySubRoster: ["gold", "white", "black"].includes(primarySubRoster)
        ? (primarySubRoster as "gold" | "white" | "black")
        : undefined,
      allowCrossColorJerseyOverlap
    });
    const refreshedStore = await readStore();
    const approvedUser = refreshedStore.users.find((entry) => entry.id === params.id);
    if (
      !approvedUser ||
      approvedUser.role !== "player" ||
      approvedUser.status !== "approved" ||
      approvedUser.rosterId !== rosterId ||
      (approvedUser.jerseyNumber ?? undefined) !== jerseyNumber
    ) {
      throw new Error("player_approval_verification_failed");
    }
    if (["gold", "white", "black"].includes(primarySubRoster)) {
      const profile = await getPlayerProfileExtra(params.id);
      if (
        profile.primarySubRoster !== primarySubRoster ||
        Boolean(profile.allowCrossColorJerseyOverlap) !== allowCrossColorJerseyOverlap
      ) {
        throw new Error("player_profile_verification_failed");
      }
    }
    if (approvedUser) {
      await linkMatchingReservationForUser({
        user: approvedUser,
        rosterId,
        jerseyNumber
      });
    }
    return NextResponse.redirect(new URL("/admin?section=players&approved=1", request.url), 303);
  } catch (error) {
    const reason = encodeURIComponent(error instanceof Error ? error.message : "approval_failed");
    return NextResponse.redirect(
      new URL(`/admin?section=players&error=approval_failed&errorDetail=${reason}`, request.url),
      303
    );
  }
}
