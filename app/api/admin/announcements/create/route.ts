import { NextResponse } from "next/server";
import { createAnnouncement, dispatchAnnouncement } from "@/lib/hq/announcements";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { getCurrentUser } from "@/lib/hq/session";

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

  try {
    const announcement = await createAnnouncement({
      title: String(formData.get("title") ?? ""),
      body: String(formData.get("body") ?? ""),
      category: String(formData.get("category") ?? "general") as "general" | "events" | "dvhl" | "urgent",
      audience: String(formData.get("audience") ?? "players") as "players" | "all_users",
      pinned: formData.get("pinned") !== null,
      isActive: true,
      expiresAt: String(formData.get("expiresAt") ?? ""),
      actorUserId: actor.id
    });

    if (formData.get("sendNow") !== null) {
      const sent = await dispatchAnnouncement({
        announcementId: announcement.id,
        actorUserId: actor.id,
        hqUrl: `${new URL(request.url).origin}/player?section=announcements&announcement=${announcement.id}`
      });
      return NextResponse.redirect(
        new URL(
          `${returnTo}${returnTo.includes("?") ? "&" : "?"}announcement=sent&sent=${sent.sentEmails}&queued=${sent.queuedPushOrSms}&failed=${sent.failedEmails}`,
          request.url
        ),
        303
      );
    }

    return NextResponse.redirect(
      new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}announcement=created`, request.url),
      303
    );
  } catch (error) {
    const reason = encodeURIComponent(error instanceof Error ? error.message : "announcement_create_failed");
    return NextResponse.redirect(
      new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=announcement_create_failed&errorDetail=${reason}`, request.url),
      303
    );
  }
}
