import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/hq/session";
import { getCalendarEventsForRole } from "@/lib/hq/events";
import { listReservationBoards } from "@/lib/hq/reservations";
import {
  canEventCollectGuests,
  getEventGuestIntentMap,
  getEventRosterSelectionMap,
  getEventSignupConfigMap,
  isInterestSignupClosed
} from "@/lib/hq/event-signups";

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
  const [signupConfigs, rosterSelections, guestIntents] = await Promise.all([
    getEventSignupConfigMap(events.map((event) => event.id)),
    getEventRosterSelectionMap(events.map((event) => event.id)),
    getEventGuestIntentMap(events.map((event) => event.id))
  ]);

  return NextResponse.json({
    events: events.map((event) => ({
      ...event,
      viewerReservationStatus: boards.viewerStatusByEvent[event.id] || null,
      reservationCount: (boards.byEvent[event.id] || []).length,
      goingCount: (boards.byEvent[event.id] || []).filter((entry) => entry.status === "going").length,
      reservationBoard: boards.byEvent[event.id] || [],
      canManage: user.role === "admin" || (user.role === "player" && event.managerUserId === user.id),
      signupMode: signupConfigs[event.id]?.signupMode || "straight_rsvp",
      interestClosesAt: signupConfigs[event.id]?.interestClosesAt || null,
      signupClosed: isInterestSignupClosed(signupConfigs[event.id]),
      finalRosterSelectedCount: rosterSelections[event.id]?.selectedUserIds.length || 0,
      viewerSelectedFinalRoster: (rosterSelections[event.id]?.selectedUserIds || []).includes(user.id),
      allowGuestRequests: canEventCollectGuests(signupConfigs[event.id], event.eventTypeName),
      guestCostEnabled: Boolean(signupConfigs[event.id]?.guestCostEnabled),
      guestCostLabel: signupConfigs[event.id]?.guestCostLabel || null,
      guestCostAmountUsd:
        typeof signupConfigs[event.id]?.guestCostAmountUsd === "number"
          ? signupConfigs[event.id]?.guestCostAmountUsd
          : null,
      viewerGuestIntent:
        (guestIntents[event.id] || []).find((entry) => entry.userId === user.id) || null
    }))
  });
}
