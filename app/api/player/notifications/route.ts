import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { upsertNotificationPreference } from "@/lib/hq/notifications";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) {
    return NextResponse.redirect(new URL("/login?error=sign_in_required", request.url), 303);
  }

  const formData = await request.formData();
  const frequencyRaw = String(formData.get("frequency") ?? "immediate").trim();
  const frequency = ["immediate", "daily", "weekly", "off"].includes(frequencyRaw)
    ? (frequencyRaw as "immediate" | "daily" | "weekly" | "off")
    : "immediate";

  const toBool = (name: string) => String(formData.get(name) ?? "").trim() === "on";

  await upsertNotificationPreference({
    userId: actor.id,
    frequency,
    channels: {
      email: toBool("channelEmail"),
      sms: toBool("channelSms"),
      push: toBool("channelPush")
    },
    categories: {
      dvhl: toBool("catDvhl"),
      national: toBool("catNational"),
      hockey: toBool("catHockey"),
      off_ice: toBool("catOffIce"),
      interest_deadline: toBool("catInterestDeadline"),
      interest_roster_finalized: toBool("catRosterFinalized"),
      guest_updates: toBool("catGuestUpdates"),
      news: toBool("catNews")
    }
  });

  return NextResponse.redirect(new URL("/player?section=notifications&saved=notifications", request.url), 303);
}
