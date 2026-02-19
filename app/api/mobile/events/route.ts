import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/hq/session";
import { getCalendarEventsForRole } from "@/lib/hq/events";
import { listReservationBoards } from "@/lib/hq/reservations";

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const approved = user.status === "approved";
  const events = await getCalendarEventsForRole(user.role, approved);
  const boards = await listReservationBoards(
    events.map((event) => event.id),
    user.id
  );

  return NextResponse.json({
    events: events.map((event) => ({
      ...event,
      viewerReservationStatus: boards.viewerStatusByEvent[event.id] || null,
      reservationCount: (boards.byEvent[event.id] || []).length,
      canManage: user.role === "admin" || (user.role === "player" && event.managerUserId === user.id)
    }))
  });
}

