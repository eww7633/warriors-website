import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/hq/session";
import { getAllEvents } from "@/lib/hq/events";
import { listReservationBoards } from "@/lib/hq/reservations";
import { getEventRosterSelectionMap, getEventSignupConfigMap } from "@/lib/hq/event-signups";

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId")?.trim() || "";
  const events = await getAllEvents();
  const targetEvents = events.filter((event) => {
    if (eventId && event.id !== eventId) return false;
    return user.role === "admin" || event.managerUserId === user.id;
  });

  if (targetEvents.length === 0) {
    return NextResponse.json({ queue: [] });
  }

  const [boards, signupConfigs, rosterSelections] = await Promise.all([
    listReservationBoards(targetEvents.map((event) => event.id)),
    getEventSignupConfigMap(targetEvents.map((event) => event.id)),
    getEventRosterSelectionMap(targetEvents.map((event) => event.id))
  ]);

  const queue = targetEvents.map((event) => {
    const selectedUserIds = rosterSelections[event.id]?.selectedUserIds || [];
    const signupMode = signupConfigs[event.id]?.signupMode || "straight_rsvp";
    const pending = (boards.byEvent[event.id] || [])
      .filter((entry) => entry.status === "going" && !selectedUserIds.includes(entry.userId))
      .map((entry) => ({
        userId: entry.userId,
        fullName: entry.fullName,
        status: entry.status,
        note: entry.note || null
      }));

    return {
      eventId: event.id,
      eventTitle: event.title,
      signupMode,
      interestClosesAt: signupConfigs[event.id]?.interestClosesAt || null,
      selectedUserIds,
      pending
    };
  });

  return NextResponse.json({ queue });
}
