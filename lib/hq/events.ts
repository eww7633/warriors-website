import crypto from "node:crypto";
import { hasDatabaseUrl } from "@/lib/db-env";
import { getPrismaClient } from "@/lib/prisma";
import { events as mockEvents } from "@/lib/mockData";
import { Role } from "@/lib/types";
import { addCheckInRecord } from "@/lib/hq/store";

type EventVisibility = "public" | "player_only" | "internal";

export type HQEvent = {
  id: string;
  title: string;
  date: string;
  publicDetails: string;
  privateDetails: string;
  visibility: EventVisibility;
  published: boolean;
  locationPublic?: string;
  locationPrivate?: string;
  locationPublicMapUrl?: string;
  locationPrivateMapUrl?: string;
  eventTypeId?: string;
  eventTypeName?: string;
  managerUserId?: string;
  managerName?: string;
};

export type HQEventType = {
  id: string;
  name: string;
  isActive: boolean;
};

export type ActiveCheckInToken = {
  eventId: string;
  token: string;
  expiresAt: string;
  createdByUserName: string;
};

function mapMockEventToHqEvent() {
  return mockEvents.map((event) => ({
    id: event.id,
    title: event.title,
    date: event.date,
    publicDetails: event.publicDetails,
    privateDetails: event.privateDetails,
    visibility: event.isPlayerOnly ? "player_only" : "public",
    published: true,
    locationPublic: undefined,
    locationPrivate: undefined,
    locationPublicMapUrl: undefined,
    locationPrivateMapUrl: undefined,
    eventTypeId: undefined,
    eventTypeName: "General",
    managerUserId: undefined,
    managerName: undefined
  })) satisfies HQEvent[];
}

async function readDbEvents() {
  const dbEvents = await getPrismaClient().event.findMany({
    include: {
      eventType: true,
      managerUser: {
        select: {
          id: true,
          fullName: true
        }
      }
    },
    orderBy: { startsAt: "asc" }
  });

  return dbEvents.map((event) => ({
    id: event.id,
    title: event.title,
    date: event.startsAt.toISOString(),
    publicDetails: event.publicDetails,
    privateDetails: event.privateDetails ?? "",
    visibility: (event.visibility as EventVisibility) ?? "public",
    published: event.published,
    locationPublic: event.locationPublic ?? undefined,
    locationPrivate: event.locationPrivate ?? undefined,
    locationPublicMapUrl: event.locationPublicMapUrl ?? undefined,
    locationPrivateMapUrl: event.locationPrivateMapUrl ?? undefined,
    eventTypeId: event.eventTypeId ?? undefined,
    eventTypeName: event.eventType?.name ?? undefined,
    managerUserId: event.managerUserId ?? undefined,
    managerName: event.managerUser?.fullName ?? undefined
  })) satisfies HQEvent[];
}

export async function getAllEvents() {
  if (!hasDatabaseUrl()) {
    return mapMockEventToHqEvent();
  }

  try {
    return await readDbEvents();
  } catch {
    return mapMockEventToHqEvent();
  }
}

export async function getCalendarEventsForRole(role: Role, approved: boolean) {
  const all = await getAllEvents();

  if (role === "admin") {
    return all;
  }

  if (role === "player" && approved) {
    return all.filter((event) => event.visibility !== "internal");
  }

  return all.filter((event) => event.visibility === "public" && event.published);
}

export async function getPublicPublishedEvents() {
  const all = await getAllEvents();
  return all.filter((event) => event.visibility === "public" && event.published);
}

export async function listEventTypes() {
  if (!hasDatabaseUrl()) {
    return [{ id: "general", name: "General", isActive: true }] satisfies HQEventType[];
  }

  const types = await getPrismaClient().eventType.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" }
  });

  if (types.length > 0) {
    return types;
  }

  const defaults = ["Practice", "Scrimmage", "Volunteer", "Off-Ice", "Game"];
  for (const name of defaults) {
    await getPrismaClient().eventType.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true }
    });
  }

  return getPrismaClient().eventType.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" }
  });
}

export async function createEventType(input: { name: string }) {
  if (!hasDatabaseUrl()) {
    throw new Error("Database mode is required to create event types.");
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Event type name is required.");
  }

  return getPrismaClient().eventType.upsert({
    where: { name },
    update: { isActive: true },
    create: { name, isActive: true }
  });
}

export async function createEvent(input: {
  title: string;
  startsAt: string;
  publicDetails: string;
  privateDetails?: string;
  visibility: EventVisibility;
  published: boolean;
  locationPublic?: string;
  locationPrivate?: string;
  locationPublicMapUrl?: string;
  locationPrivateMapUrl?: string;
  eventTypeId?: string;
  managerUserId?: string;
}) {
  if (!hasDatabaseUrl()) {
    throw new Error("Database mode is required to create events.");
  }

  const startsAtDate = new Date(input.startsAt);
  if (Number.isNaN(startsAtDate.getTime())) {
    throw new Error("Invalid event start date.");
  }

  return getPrismaClient().event.create({
    data: {
      title: input.title,
      startsAt: startsAtDate,
      publicDetails: input.publicDetails,
      privateDetails: input.privateDetails,
      visibility: input.visibility,
      published: input.published,
      locationPublic: input.locationPublic,
      locationPrivate: input.locationPrivate,
      locationPublicMapUrl: input.locationPublicMapUrl,
      locationPrivateMapUrl: input.locationPrivateMapUrl,
      eventTypeId: input.eventTypeId || null,
      managerUserId: input.managerUserId || null
    }
  });
}

export async function updateEvent(input: {
  eventId: string;
  title: string;
  startsAt: string;
  publicDetails: string;
  privateDetails?: string;
  visibility: EventVisibility;
  published: boolean;
  locationPublic?: string;
  locationPrivate?: string;
  locationPublicMapUrl?: string;
  locationPrivateMapUrl?: string;
  eventTypeId?: string;
  managerUserId?: string;
}) {
  if (!hasDatabaseUrl()) {
    throw new Error("Database mode is required to update events.");
  }

  const startsAtDate = new Date(input.startsAt);
  if (Number.isNaN(startsAtDate.getTime())) {
    throw new Error("Invalid event start date.");
  }

  return getPrismaClient().event.update({
    where: { id: input.eventId },
    data: {
      title: input.title,
      startsAt: startsAtDate,
      publicDetails: input.publicDetails,
      privateDetails: input.privateDetails,
      visibility: input.visibility,
      published: input.published,
      locationPublic: input.locationPublic,
      locationPrivate: input.locationPrivate,
      locationPublicMapUrl: input.locationPublicMapUrl,
      locationPrivateMapUrl: input.locationPrivateMapUrl,
      eventTypeId: input.eventTypeId || null,
      managerUserId: input.managerUserId || null
    }
  });
}

export async function deleteEvent(eventId: string) {
  if (!hasDatabaseUrl()) {
    throw new Error("Database mode is required to delete events.");
  }

  return getPrismaClient().event.delete({
    where: { id: eventId }
  });
}

export async function createEventCheckInToken(input: {
  eventId: string;
  actorUserId: string;
}) {
  if (!hasDatabaseUrl()) {
    throw new Error("Database mode is required to generate QR check-in tokens.");
  }

  const event = await getPrismaClient().event.findUnique({
    where: { id: input.eventId },
    select: {
      id: true,
      managerUserId: true
    }
  });

  if (!event) {
    throw new Error("Event not found.");
  }

  const actor = await getPrismaClient().user.findUnique({
    where: { id: input.actorUserId },
    select: {
      role: true
    }
  });

  if (!actor) {
    throw new Error("Unauthorized.");
  }

  const canManage = actor.role === "admin" || event.managerUserId === input.actorUserId;
  if (!canManage) {
    throw new Error("Only admin or assigned game manager can generate QR check-in tokens.");
  }

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000);

  await getPrismaClient().eventCheckInToken.updateMany({
    where: {
      eventId: event.id,
      revokedAt: null,
      expiresAt: { gt: new Date() }
    },
    data: {
      revokedAt: new Date()
    }
  });

  const created = await getPrismaClient().eventCheckInToken.create({
    data: {
      token,
      eventId: event.id,
      createdByUserId: input.actorUserId,
      expiresAt
    },
    include: {
      createdByUser: {
        select: {
          fullName: true
        }
      }
    }
  });

  return {
    eventId: created.eventId,
    token: created.token,
    expiresAt: created.expiresAt.toISOString(),
    createdByUserName: created.createdByUser.fullName
  } satisfies ActiveCheckInToken;
}

export async function listActiveCheckInTokens(eventIds: string[]) {
  if (!hasDatabaseUrl() || eventIds.length === 0) {
    return {} as Record<string, ActiveCheckInToken | undefined>;
  }

  const rows = await getPrismaClient().eventCheckInToken.findMany({
    where: {
      eventId: { in: eventIds },
      revokedAt: null,
      expiresAt: { gt: new Date() }
    },
    include: {
      createdByUser: {
        select: {
          fullName: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const map: Record<string, ActiveCheckInToken | undefined> = {};

  for (const row of rows) {
    if (map[row.eventId]) {
      continue;
    }

    map[row.eventId] = {
      eventId: row.eventId,
      token: row.token,
      expiresAt: row.expiresAt.toISOString(),
      createdByUserName: row.createdByUser.fullName
    };
  }

  return map;
}

export async function completeQrCheckIn(input: {
  token: string;
  userId: string;
}) {
  if (!hasDatabaseUrl()) {
    throw new Error("Database mode is required to use QR check-in.");
  }

  const tokenRow = await getPrismaClient().eventCheckInToken.findUnique({
    where: { token: input.token },
    include: {
      event: {
        select: {
          id: true,
          title: true
        }
      }
    }
  });

  if (!tokenRow || tokenRow.revokedAt || tokenRow.expiresAt <= new Date()) {
    throw new Error("Check-in code is invalid or expired.");
  }

  const user = await getPrismaClient().user.findUnique({
    where: { id: input.userId },
    select: {
      role: true,
      status: true,
      fullName: true
    }
  });

  if (!user) {
    throw new Error("Account not found.");
  }

  const allowed =
    user.role === "admin" || (user.role === "player" && user.status === "approved");

  if (!allowed) {
    throw new Error("Only approved players can check in.");
  }

  const existing = await getPrismaClient().checkIn.findFirst({
    where: {
      userId: input.userId,
      eventId: tokenRow.eventId
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (existing) {
    await getPrismaClient().checkIn.update({
      where: { id: existing.id },
      data: {
        checkedInAt: new Date(),
        arrivedAt: new Date(),
        attendanceStatus: "checked_in_attended",
        note: "QR check-in"
      }
    });
  } else {
    await addCheckInRecord({
      userId: input.userId,
      eventId: tokenRow.eventId,
      attendanceStatus: "checked_in_attended",
      note: "QR check-in"
    });
  }

  await getPrismaClient().eventReservation.upsert({
    where: {
      eventId_userId: {
        eventId: tokenRow.eventId,
        userId: input.userId
      }
    },
    create: {
      eventId: tokenRow.eventId,
      userId: input.userId,
      status: "going",
      note: "Auto-updated from QR check-in"
    },
    update: {
      status: "going",
      note: "Auto-updated from QR check-in"
    }
  });

  return {
    eventId: tokenRow.event.id,
    eventTitle: tokenRow.event.title,
    userName: user.fullName
  };
}
