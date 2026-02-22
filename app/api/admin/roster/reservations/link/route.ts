import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { readStore } from "@/lib/hq/store";
import { findRosterReservationById, linkRosterReservationToUser } from "@/lib/hq/roster-reservations";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const reservationId = String(formData.get("reservationId") ?? "").trim();
  const userId = String(formData.get("userId") ?? "").trim();

  if (!reservationId || !userId) {
    return NextResponse.redirect(new URL("/admin?section=players&error=reservation_link_fields", request.url), 303);
  }

  try {
    const store = await readStore();
    const user = store.users.find((entry) => entry.id === userId);
    if (!user) {
      throw new Error("user_not_found");
    }

    await linkRosterReservationToUser({ reservationId, user });
    const linkedReservation = await findRosterReservationById(reservationId);
    if (!linkedReservation || linkedReservation.linkedUserId !== userId) {
      throw new Error("reservation_link_verification_failed");
    }
    return NextResponse.redirect(new URL("/admin?section=players&reservationlinked=1", request.url), 303);
  } catch (error) {
    const reason = encodeURIComponent(error instanceof Error ? error.message : "reservation_link_failed");
    return NextResponse.redirect(
      new URL(`/admin?section=players&error=reservation_link_failed&errorDetail=${reason}`, request.url),
      303
    );
  }
}
