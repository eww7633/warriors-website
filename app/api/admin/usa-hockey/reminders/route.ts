import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { userHasPermission } from "@/lib/hq/permissions";
import { listUsaHockeyRenewalCandidates, usaHockeyEligibilityReason } from "@/lib/hq/player-profiles";
import { readStore } from "@/lib/hq/store";
import { canEmailUserForCategory } from "@/lib/hq/notifications";
import { sendUsaHockeyReminderEmail } from "@/lib/email";
import { enqueueMobilePushTrigger } from "@/lib/hq/mobile-push";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await userHasPermission(actor, "manage_players"))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const candidates = await listUsaHockeyRenewalCandidates();
  const store = await readStore();
  const byUserId = new Map(store.users.map((entry) => [entry.id, entry]));

  let sent = 0;
  let skipped = 0;

  for (const profile of candidates) {
    const user = byUserId.get(profile.userId);
    if (!user || !user.email || user.role !== "player" || user.status !== "approved") {
      skipped += 1;
      continue;
    }

    if (!(await canEmailUserForCategory(user.id, "hockey"))) {
      skipped += 1;
      continue;
    }

    const result = await sendUsaHockeyReminderEmail({
      to: user.email,
      fullName: user.fullName,
      hqProfileUrl: `${new URL(request.url).origin}/player?section=profile`,
      reason: usaHockeyEligibilityReason(profile)
    });

    if (result.sent) {
      sent += 1;
      try {
        await enqueueMobilePushTrigger({
          type: "reminder_sent",
          actorUserId: actor.id,
          targetUserId: user.id,
          title: "USA Hockey reminder sent",
          body: `Reminder delivered to ${user.fullName}.`,
          payload: {
            category: "usa_hockey",
            reason: usaHockeyEligibilityReason(profile)
          }
        });
      } catch {}
    } else {
      skipped += 1;
    }
  }

  return NextResponse.redirect(
    new URL(`/admin/roster?usaReminder=sent&sent=${sent}&skipped=${skipped}`, request.url),
    303
  );
}
