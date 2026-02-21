import { NextResponse } from "next/server";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { getCurrentUser } from "@/lib/hq/session";
import { deleteAnnouncement } from "@/lib/hq/announcements";

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

  await deleteAnnouncement(announcementId);
  return NextResponse.redirect(
    new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}announcement=deleted`, request.url),
    303
  );
}
