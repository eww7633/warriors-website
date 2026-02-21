import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/hq/session";
import { readStore } from "@/lib/hq/store";
import { getCalendarEventsForRole } from "@/lib/hq/events";
import { listAnnouncements } from "@/lib/hq/announcements";

function toPublicUser(user: {
  id: string;
  fullName: string;
  email: string;
  requestedPosition?: string;
  phone?: string;
  role: string;
  status: string;
  activityStatus: string;
  rosterId?: string;
  jerseyNumber?: number;
  equipmentSizes: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    requestedPosition: user.requestedPosition,
    phone: user.phone,
    role: user.role,
    status: user.status,
    activityStatus: user.activityStatus,
    rosterId: user.rosterId,
    jerseyNumber: user.jerseyNumber,
    equipmentSizes: user.equipmentSizes,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const approved = user.status === "approved";
  const [store, events, announcements] = await Promise.all([
    readStore(),
    getCalendarEventsForRole(user.role, approved),
    listAnnouncements({
      activeOnly: true,
      audience: user.role === "player" ? "players" : "all_users",
      includeExpired: false,
      limit: 5
    })
  ]);

  const pendingRegistrations = store.users.filter((entry) => entry.status === "pending").length;
  const approvedPlayers = store.users.filter(
    (entry) => entry.status === "approved" && entry.role === "player"
  ).length;
  const recentCheckIns = store.checkIns.filter((entry) => {
    const stamp = entry.checkedInAt || entry.arrivedAt;
    return Boolean(stamp) && Date.now() - new Date(stamp || "").getTime() <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  return NextResponse.json({
    user: toPublicUser(user),
    stats: {
      pendingRegistrations,
      approvedPlayers,
      recentCheckIns,
      visibleEvents: events.length
    },
    announcements
  });
}
