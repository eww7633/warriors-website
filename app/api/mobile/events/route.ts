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
    events: events.map((event) => {
        const reservationBoard = boards.byEvent[event.id] || [];
        const canManage = user.role === "admin" || (user.role === "player" && event.managerUserId === user.id);
        const selectedIds = rosterSelections[event.id]?.selectedUserIds || [];
        const signupConfig = signupConfigs[event.id];
        const signupMode = signupConfig?.signupMode || "straight_rsvp";
        const viewerReservationStatus = boards.viewerStatusByEvent[event.id] || null;
        const viewerNeedsApproval =
          signupMode === "interest_gathering" && viewerReservationStatus === "going" && !selectedIds.includes(user.id);
        const viewerCanRsvp = user.role === "admin" || (user.role === "player" && user.status === "approved");
        const reservationBoardPublic =
          canManage || (user.role === "player" && user.status === "approved")
            ? reservationBoard
            : reservationBoard.map((entry) => ({
                userId: entry.userId,
                fullName: "Player",
                status: entry.status
              }));

        return {
          ...event,
          viewerReservationStatus,
          reservationCount: reservationBoard.length,
          goingCount: reservationBoard.filter((entry) => entry.status === "going").length,
          reservationBoard: reservationBoardPublic,
          canManage,
          signupMode,
          interestClosesAt: signupConfig?.interestClosesAt || null,
          signupClosed: isInterestSignupClosed(signupConfig),
          finalRosterSelectedCount: selectedIds.length,
          viewerSelectedFinalRoster: selectedIds.includes(user.id),
          viewerNeedsApproval,
          viewerCanRsvp,
          requiresUsaHockeyVerified: Boolean(signupConfig?.requiresUsaHockeyVerified),
          allowGuestRequests: canEventCollectGuests(signupConfig, event.eventTypeName),
          guestCostEnabled: Boolean(signupConfig?.guestCostEnabled),
          guestCostLabel: signupConfig?.guestCostLabel || null,
          guestCostAmountUsd:
            typeof signupConfig?.guestCostAmountUsd === "number" ? signupConfig?.guestCostAmountUsd : null,
          viewerGuestIntent: (guestIntents[event.id] || []).find((entry) => entry.userId === user.id) || null,
          rsvpApprovalQueue:
            canManage && signupMode === "interest_gathering"
              ? reservationBoard
                  .filter((entry) => entry.status === "going" && !selectedIds.includes(entry.userId))
                  .map((entry) => ({
                    userId: entry.userId,
                    fullName: entry.fullName,
                    status: entry.status,
                    note: entry.note || null
                  }))
              : []
        };
      })
  });
}
