import { hasDatabaseUrl } from "@/lib/db-env";
import { getPrismaClient } from "@/lib/prisma";
import { addCheckInRecord, readStore } from "@/lib/hq/store";

export type ReservationStatus = "going" | "maybe" | "not_going";

const validStatuses: ReservationStatus[] = ["going", "maybe", "not_going"];

export function isValidReservationStatus(value: string): value is ReservationStatus {
  return validStatuses.includes(value as ReservationStatus);
}

export async function setEventReservation(input: {
  userId: string;
  eventId: string;
  status: ReservationStatus;
  note?: string;
}) {
  if (!hasDatabaseUrl()) {
    const mapped =
      input.status === "going"
        ? "checked_in_attended"
        : input.status === "maybe"
        ? "checked_in_no_show"
        : "absent";
    await addCheckInRecord({
      userId: input.userId,
      eventId: input.eventId,
      attendanceStatus: mapped,
      note: input.note
    });
    return;
  }

  await getPrismaClient().eventReservation.upsert({
    where: {
      eventId_userId: {
        eventId: input.eventId,
        userId: input.userId
      }
    },
    create: {
      eventId: input.eventId,
      userId: input.userId,
      status: input.status,
      note: input.note || null
    },
    update: {
      status: input.status,
      note: input.note || null
    }
  });
}

export async function listReservationBoards(eventIds: string[], viewerUserId?: string) {
  if (eventIds.length === 0) {
    return {
      byEvent: {} as Record<string, Array<{ userId: string; fullName: string; status: ReservationStatus; note?: string }>>,
      viewerStatusByEvent: {} as Record<string, ReservationStatus | undefined>
    };
  }

  if (!hasDatabaseUrl()) {
    const store = await readStore();
    const byEvent: Record<string, Array<{ userId: string; fullName: string; status: ReservationStatus; note?: string }>> = {};
    const viewerStatusByEvent: Record<string, ReservationStatus | undefined> = {};

    for (const eventId of eventIds) {
      const rows = store.checkIns.filter((entry) => entry.eventId === eventId);
      byEvent[eventId] = rows.map((row) => {
        const user = store.users.find((entry) => entry.id === row.userId);
        const status: ReservationStatus =
          row.attendanceStatus === "absent"
            ? "not_going"
            : row.attendanceStatus === "checked_in_no_show"
            ? "maybe"
            : "going";
        if (viewerUserId && row.userId === viewerUserId) {
          viewerStatusByEvent[eventId] = status;
        }
        return {
          userId: row.userId,
          fullName: user?.fullName ?? "Player",
          status,
          note: row.note ?? undefined
        };
      });
    }

    return { byEvent, viewerStatusByEvent };
  }

  const rows = await getPrismaClient().eventReservation.findMany({
    where: {
      eventId: { in: eventIds }
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          status: true,
          role: true
        }
      }
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }]
  });

  const byEvent: Record<string, Array<{ userId: string; fullName: string; status: ReservationStatus; note?: string }>> = {};
  const viewerStatusByEvent: Record<string, ReservationStatus | undefined> = {};

  for (const eventId of eventIds) {
    byEvent[eventId] = [];
  }

  for (const row of rows) {
    if (row.user.role !== "player" && row.user.role !== "admin") {
      continue;
    }
    if (row.user.status !== "approved") {
      continue;
    }

    const status = isValidReservationStatus(row.status) ? row.status : "maybe";
    byEvent[row.eventId] ??= [];
    byEvent[row.eventId].push({
      userId: row.userId,
      fullName: row.user.fullName,
      status,
      note: row.note ?? undefined
    });

    if (viewerUserId && row.userId === viewerUserId) {
      viewerStatusByEvent[row.eventId] = status;
    }
  }

  return { byEvent, viewerStatusByEvent };
}
