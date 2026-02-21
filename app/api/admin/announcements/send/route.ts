import { NextResponse } from "next/server";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { getCurrentUser } from "@/lib/hq/session";
import { dispatchAnnouncement } from "@/lib/hq/announcements";

function getReturnPath(raw: string) {
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/admin?section=announcements";
  }
  return value;
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const returnTo = getReturnPath(String(formData.get("returnTo") ?? "/admin?section=announcements"));
  const announcementId = String(formData.get("announcementId") ?? "").trim();

  if (!announcementId) {
    return NextResponse.redirect(
      new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=missing_announcement_id`, request.url),
      303
    );
  }

  try {
    const result = await dispatchAnnouncement({
      announcementId,
      actorUserId: actor.id,
      hqUrl: `${new URL(request.url).origin}/player?section=announcements&announcement=${announcementId}`
    });

    return NextResponse.redirect(
      new URL(
        `${returnTo}${returnTo.includes("?") ? "&" : "?"}announcement=sent&sent=${result.sentEmails}&queued=${result.queuedPushOrSms}&failed=${result.failedEmails}`,
        request.url
      ),
      303
    );
  } catch (error) {
    const reason = encodeURIComponent(error instanceof Error ? error.message : "announcement_send_failed");
    return NextResponse.redirect(
      new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=announcement_send_failed&errorDetail=${reason}`, request.url),
      303
    );
  }
}
