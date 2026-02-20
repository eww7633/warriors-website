import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { getEventSignupConfig, setEventRosterSelection } from "@/lib/hq/event-signups";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { getAllEvents } from "@/lib/hq/events";
import { readStore } from "@/lib/hq/store";
import { sendInterestRosterFinalizedEmail } from "@/lib/email";
import { canEmailUserForCategory } from "@/lib/hq/notifications";

function getReturnPath(raw: string) {
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/admin?section=events";
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
  const returnTo = getReturnPath(String(formData.get("returnTo") ?? "/admin?section=events"));
  const selectedUserIds = formData
    .getAll("selectedUserIds")
    .map((entry) => String(entry))
    .filter(Boolean);

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
      new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}rosterselected=1`, request.url),
      303
    );
  } catch {
    return NextResponse.redirect(
      new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=roster_select_failed`, request.url),
      303
    );
  }
}
