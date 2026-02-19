import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { isValidReservationStatus, setEventReservation } from "@/lib/hq/reservations";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=sign_in_required", request.url), 303);
  }

  if (user.role !== "admin" && (user.role !== "player" || user.status !== "approved")) {
    return NextResponse.redirect(new URL("/player?error=approval_required", request.url), 303);
  }

  const formData = await request.formData();
  const eventId = String(formData.get("eventId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!eventId || !isValidReservationStatus(status)) {
    return NextResponse.redirect(new URL("/calendar?error=invalid_reservation_fields", request.url), 303);
  }

  try {
    await setEventReservation({
      userId: user.id,
      eventId,
      status,
      note
    });
    return NextResponse.redirect(new URL("/calendar?reservation=saved", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/calendar?error=reservation_save_failed", request.url), 303);
  }
}
