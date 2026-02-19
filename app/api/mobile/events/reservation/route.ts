import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/hq/session";
import { isValidReservationStatus, setEventReservation } from "@/lib/hq/reservations";

export async function POST(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (user.role !== "admin" && (user.role !== "player" || user.status !== "approved")) {
    return NextResponse.json({ error: "approval_required" }, { status: 403 });
  }

  let payload: { eventId?: string; status?: string; note?: string } = {};
  try {
    payload = (await request.json()) as { eventId?: string; status?: string; note?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const eventId = String(payload.eventId ?? "").trim();
  const status = String(payload.status ?? "").trim();
  const note = String(payload.note ?? "").trim();

  if (!eventId || !isValidReservationStatus(status)) {
    return NextResponse.json({ error: "invalid_reservation_fields" }, { status: 400 });
  }

  try {
    await setEventReservation({
      userId: user.id,
      eventId,
      status,
      note
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "reservation_save_failed" }, { status: 500 });
  }
}

