import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/hq/session";
import { listAnnouncements } from "@/lib/hq/announcements";

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const audience = user.role === "player" ? "players" : "all_users";
  const announcements = await listAnnouncements({
    activeOnly: true,
    audience,
    includeExpired: false,
    limit: 20
  });

  return NextResponse.json({ announcements });
}
