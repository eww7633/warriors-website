import { hasDatabaseUrl } from "@/lib/db-env";
import { getPrismaClient } from "@/lib/prisma";
import { getAllEvents } from "@/lib/hq/events";
import { readStore } from "@/lib/hq/store";
import { ReservationStatus } from "@/lib/hq/reservations";

type AttendanceStatus = "checked_in_attended" | "checked_in_no_show" | "walk_in_attended" | "absent";

type ReservationRecord = {
  eventId: string;
  userId: string;
  status: ReservationStatus;
};

type CheckInRecord = {
  eventId: string;
  userId: string;
  status: AttendanceStatus;
  occurredAt?: string;
};

type MemberRef = {
  id: string;
  fullName: string;
  email: string;
};

export type AttendanceEventInsight = {
  eventId: string;
  title: string;
  date: string;
  reservationsGoing: number;
  reservationsMaybe: number;
  reservationsNotGoing: number;
  attendedCount: number;
  noShowAfterRsvpCount: number;
  walkInWithoutRsvpCount: number;
  attendedAfterNotGoingCount: number;
};

export type AttendancePlayerInsight = {
  userId: string;
  fullName: string;
  email: string;
  noShowAfterRsvp: number;
  walkInWithoutRsvp: number;
  attendedAfterNotGoing: number;
  attendedTotal: number;
};

function isAttended(status?: AttendanceStatus) {
  return status === "checked_in_attended" || status === "walk_in_attended";
}

function mapFallbackReservation(status: AttendanceStatus): ReservationStatus | undefined {
  if (status === "checked_in_attended") {
    return "going";
  }
  if (status === "checked_in_no_show") {
    return "maybe";
  }
  if (status === "absent") {
    return "not_going";
  }
  return undefined;
}

function buildLatestCheckInMap(records: CheckInRecord[]) {
  const map = new Map<string, CheckInRecord>();
  for (const row of records) {
    const key = `${row.eventId}:${row.userId}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, row);
      continue;
    }
    const currentAt = row.occurredAt ? new Date(row.occurredAt).getTime() : 0;
    const existingAt = existing.occurredAt ? new Date(existing.occurredAt).getTime() : 0;
    if (currentAt >= existingAt) {
      map.set(key, row);
    }
  }
  return map;
}

export async function summarizeAttendanceInsights() {
  const events = await getAllEvents();
  const now = Date.now();
  const eventIds = events.map((event) => event.id);

  let members: MemberRef[] = [];
  let reservations: ReservationRecord[] = [];
  let checkIns: CheckInRecord[] = [];

  if (!hasDatabaseUrl()) {
    const store = await readStore();
    members = store.users
      .filter((entry) => (entry.role === "player" || entry.role === "admin") && entry.status === "approved")
      .map((entry) => ({
        id: entry.id,
        fullName: entry.fullName,
        email: entry.email
      }));

    checkIns = store.checkIns
      .filter((entry) => eventIds.includes(entry.eventId))
      .map((entry) => ({
        eventId: entry.eventId,
        userId: entry.userId,
        status: entry.attendanceStatus,
        occurredAt: entry.checkedInAt || entry.arrivedAt
      }));

    reservations = checkIns
      .map((entry) => ({
        eventId: entry.eventId,
        userId: entry.userId,
        status: mapFallbackReservation(entry.status)
      }))
      .filter((entry): entry is ReservationRecord => Boolean(entry.status));
  } else {
    const [users, reservationRows, checkInRows] = await Promise.all([
      getPrismaClient().user.findMany({
        where: {
          role: { in: ["player", "admin"] },
          status: "approved"
        },
        select: {
          id: true,
          fullName: true,
          email: true
        }
      }),
      getPrismaClient().eventReservation.findMany({
        where: {
          eventId: { in: eventIds }
        },
        select: {
          eventId: true,
          userId: true,
          status: true
        }
      }),
      getPrismaClient().checkIn.findMany({
        where: {
          eventId: { in: eventIds }
        },
        select: {
          eventId: true,
          userId: true,
          attendanceStatus: true,
          createdAt: true,
          checkedInAt: true,
          arrivedAt: true
        }
      })
    ]);

    members = users;
    reservations = reservationRows
      .filter((entry) => ["going", "maybe", "not_going"].includes(entry.status))
      .map((entry) => ({
        eventId: entry.eventId,
        userId: entry.userId,
        status: entry.status as ReservationStatus
      }));
    checkIns = checkInRows
      .filter((entry) =>
        ["checked_in_attended", "checked_in_no_show", "walk_in_attended", "absent"].includes(
          entry.attendanceStatus
        )
      )
      .map((entry) => ({
        eventId: entry.eventId,
        userId: entry.userId,
        status: entry.attendanceStatus as AttendanceStatus,
        occurredAt: entry.arrivedAt?.toISOString() || entry.checkedInAt?.toISOString() || entry.createdAt.toISOString()
      }));
  }

  const reservationsByKey = new Map<string, ReservationStatus>();
  for (const row of reservations) {
    reservationsByKey.set(`${row.eventId}:${row.userId}`, row.status);
  }

  const latestCheckInByKey = buildLatestCheckInMap(checkIns);
  const playersById = new Map(members.map((entry) => [entry.id, entry]));

  const eventInsights: AttendanceEventInsight[] = [];
  const playerAgg = new Map<string, AttendancePlayerInsight>();

  for (const event of events) {
    const eventTime = new Date(event.date).getTime();
    const isPast = Number.isFinite(eventTime) ? eventTime < now : false;

    let reservationsGoing = 0;
    let reservationsMaybe = 0;
    let reservationsNotGoing = 0;
    let attendedCount = 0;
    let noShowAfterRsvpCount = 0;
    let walkInWithoutRsvpCount = 0;
    let attendedAfterNotGoingCount = 0;

    for (const member of members) {
      const key = `${event.id}:${member.id}`;
      const rsvp = reservationsByKey.get(key);
      const check = latestCheckInByKey.get(key);
      const attended = isAttended(check?.status);

      if (rsvp === "going") {
        reservationsGoing += 1;
      } else if (rsvp === "maybe") {
        reservationsMaybe += 1;
      } else if (rsvp === "not_going") {
        reservationsNotGoing += 1;
      }

      if (attended) {
        attendedCount += 1;
      }

      let player = playerAgg.get(member.id);
      if (!player) {
        player = {
          userId: member.id,
          fullName: member.fullName,
          email: member.email,
          noShowAfterRsvp: 0,
          walkInWithoutRsvp: 0,
          attendedAfterNotGoing: 0,
          attendedTotal: 0
        };
        playerAgg.set(member.id, player);
      }

      if (attended) {
        player.attendedTotal += 1;
      }

      if (isPast && (rsvp === "going" || rsvp === "maybe") && !attended) {
        noShowAfterRsvpCount += 1;
        player.noShowAfterRsvp += 1;
      }

      if (attended && !rsvp) {
        walkInWithoutRsvpCount += 1;
        player.walkInWithoutRsvp += 1;
      }

      if (attended && rsvp === "not_going") {
        attendedAfterNotGoingCount += 1;
        player.attendedAfterNotGoing += 1;
      }
    }

    eventInsights.push({
      eventId: event.id,
      title: event.title,
      date: event.date,
      reservationsGoing,
      reservationsMaybe,
      reservationsNotGoing,
      attendedCount,
      noShowAfterRsvpCount,
      walkInWithoutRsvpCount,
      attendedAfterNotGoingCount
    });
  }

  const topNoShows = Array.from(playerAgg.values())
    .filter((entry) => entry.noShowAfterRsvp > 0 || entry.walkInWithoutRsvp > 0 || entry.attendedAfterNotGoing > 0)
    .sort((a, b) => {
      if (b.noShowAfterRsvp !== a.noShowAfterRsvp) {
        return b.noShowAfterRsvp - a.noShowAfterRsvp;
      }
      if (b.walkInWithoutRsvp !== a.walkInWithoutRsvp) {
        return b.walkInWithoutRsvp - a.walkInWithoutRsvp;
      }
      return b.attendedAfterNotGoing - a.attendedAfterNotGoing;
    });

  const totals = eventInsights.reduce(
    (acc, event) => {
      acc.noShowAfterRsvp += event.noShowAfterRsvpCount;
      acc.walkInWithoutRsvp += event.walkInWithoutRsvpCount;
      acc.attendedAfterNotGoing += event.attendedAfterNotGoingCount;
      return acc;
    },
    { noShowAfterRsvp: 0, walkInWithoutRsvp: 0, attendedAfterNotGoing: 0 }
  );

  return {
    eventInsights: eventInsights.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    topNoShows,
    totals,
    fallbackMode: !hasDatabaseUrl(),
    totalMembers: playersById.size
  };
}
