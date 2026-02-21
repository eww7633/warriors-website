import { NextResponse } from "next/server";
import {
  getEventSignupConfig,
  isInterestSignupClosed,
  setEventRosterSelection
} from "@/lib/hq/event-signups";
import { getAllEvents } from "@/lib/hq/events";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { listReservationBoards } from "@/lib/hq/reservations";
import { canEmailUserForCategory } from "@/lib/hq/notifications";
import { readStore } from "@/lib/hq/store";
import { getCurrentUser } from "@/lib/hq/session";
import { sendInterestRosterFinalizedEmail } from "@/lib/email";
import { getPlayerProfileExtra, isUsaHockeyVerifiedForSeason } from "@/lib/hq/player-profiles";
import { enqueueMobilePushTrigger } from "@/lib/hq/mobile-push";

function getReturnPath(raw: string) {
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/admin?section=onice";
  }
  return value;
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const eventId = String(formData.get("eventId") ?? "").trim();
  const returnTo = getReturnPath(String(formData.get("returnTo") ?? "/admin?section=onice"));
  const respectCloseWindow = formData.get("respectCloseWindow") !== null;

  if (!eventId) {
    return NextResponse.redirect(
      new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=missing_event_id`, request.url),
      303
    );
  }

  const config = await getEventSignupConfig(eventId);
  if (!config || config.signupMode !== "interest_gathering") {
    return NextResponse.redirect(
      new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=invalid_signup_mode`, request.url),
      303
    );
  }

  if (respectCloseWindow && !isInterestSignupClosed(config)) {
    return NextResponse.redirect(
      new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=interest_window_still_open`, request.url),
      303
    );
  }

  const reservationBoards = await listReservationBoards([eventId]);
  const interested = (reservationBoards.byEvent[eventId] || []).filter((entry) => entry.status !== "not_going");
  if (interested.length === 0) {
    return NextResponse.redirect(
      new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=no_interested_players`, request.url),
      303
    );
  }

  const sorted = interested.sort((a, b) => {
    const score = (value: "going" | "maybe") => (value === "going" ? 2 : 1);
    const delta = score(b.status as "going" | "maybe") - score(a.status as "going" | "maybe");
    if (delta !== 0) return delta;
    return a.fullName.localeCompare(b.fullName);
  });
  const maxSelected =
    typeof config.targetRosterSize === "number" && config.targetRosterSize > 0
      ? config.targetRosterSize
      : sorted.length;
  let selectedUserIds = sorted.slice(0, maxSelected).map((entry) => entry.userId);
  if (config.requiresUsaHockeyVerified) {
    const checked = await Promise.all(
      selectedUserIds.map(async (id) => {
        const profile = await getPlayerProfileExtra(id);
        return isUsaHockeyVerifiedForSeason(profile) ? id : null;
      })
    );
    selectedUserIds = checked.filter(Boolean) as string[];
  }

  try {
    await setEventRosterSelection({
      eventId,
      selectedUserIds,
      updatedByUserId: actor.id
    });

    const [events, store] = await Promise.all([getAllEvents(), readStore()]);
    const event = events.find((entry) => entry.id === eventId);
    if (event) {
      const selectedUsers = store.users.filter(
        (entry) => selectedUserIds.includes(entry.id) && Boolean(entry.email)
      );
      const guestReminder =
        config.guestCostEnabled && config.guestCostAmountUsd
          ? `${config.guestCostLabel || "Guest fee"}: $${config.guestCostAmountUsd.toFixed(2)} per guest.`
          : config.guestCostEnabled
            ? `${config.guestCostLabel || "Guest fee"} may apply for guests.`
            : undefined;

      await Promise.all(
        selectedUsers.map(async (member) => {
          try {
            await enqueueMobilePushTrigger({
              type: "reminder_sent",
              actorUserId: actor.id,
              targetUserId: member.id,
              eventId: event.id,
              title: "Final roster selected",
              body: `Hockey Ops selected you for ${event.title}.`,
              payload: {
                category: "interest_roster_finalized"
              }
            });
          } catch {}
          if (!(await canEmailUserForCategory(member.id, "interest_roster_finalized"))) {
            return;
          }

          await sendInterestRosterFinalizedEmail({
            to: member.email,
            fullName: member.fullName,
            eventTitle: event.title,
            eventStartsAt: event.date,
            eventLocation: event.locationPrivate || event.locationPublic,
            hqEventUrl: `${new URL(request.url).origin}/player?section=events`,
            guestCostReminder: guestReminder
          });
        })
      );
    }

    return NextResponse.redirect(
      new URL(
        `${returnTo}${returnTo.includes("?") ? "&" : "?"}rosterselected=1&generated=1`,
        request.url
      ),
      303
    );
  } catch {
    return NextResponse.redirect(
      new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=roster_generation_failed`, request.url),
      303
    );
  }
}
