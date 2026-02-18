import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { addCheckInRecord } from "@/lib/hq/store";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=sign_in_required", request.url), 303);
  }

  if (user.role !== "admin" && (user.role !== "player" || user.status !== "approved" || !user.rosterId)) {
    return NextResponse.redirect(new URL("/player?error=approval_required", request.url), 303);
  }

  const formData = await request.formData();
  const eventId = String(formData.get("eventId") ?? "").trim();
  const attendanceStatus = String(formData.get("attendanceStatus") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  const validStatuses = [
    "checked_in_attended",
    "checked_in_no_show",
    "walk_in_attended",
    "absent"
  ];

  if (!eventId || !validStatuses.includes(attendanceStatus)) {
    return NextResponse.redirect(new URL("/check-in?error=invalid_fields", request.url), 303);
  }

  await addCheckInRecord({
    userId: user.id,
    eventId,
    attendanceStatus: attendanceStatus as
      | "checked_in_attended"
      | "checked_in_no_show"
      | "walk_in_attended"
      | "absent",
    note
  });

  return NextResponse.redirect(new URL("/check-in?saved=1", request.url), 303);
}
