import { NextResponse } from "next/server";
import { updateAnnouncement } from "@/lib/hq/announcements";
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
  const announcementId = String(formData.get("announcementId") ?? "").trim();

  if (!announcementId) {
    return NextResponse.redirect(
      new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=missing_announcement_id`, request.url),
      303
    );
  }

  try {
    await updateAnnouncement({
      id: announcementId,
      title: String(formData.get("title") ?? ""),
      body: String(formData.get("body") ?? ""),
      category: String(formData.get("category") ?? "general") as "general" | "events" | "dvhl" | "urgent",
      audience: String(formData.get("audience") ?? "players") as "players" | "all_users",
      pinned: formData.get("pinned") !== null,
      isActive: formData.get("isActive") !== null,
      expiresAt: String(formData.get("expiresAt") ?? ""),
      actorUserId: actor.id
    });

    return NextResponse.redirect(
      new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}announcement=updated`, request.url),
      303
    );
  } catch (error) {
    const reason = encodeURIComponent(error instanceof Error ? error.message : "announcement_update_failed");
    return NextResponse.redirect(
      new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=announcement_update_failed&errorDetail=${reason}`, request.url),
      303
    );
  }
}
