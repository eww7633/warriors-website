import { hasDatabaseUrl } from "@/lib/db-env";
import { getPrismaClient } from "@/lib/prisma";
import { events as mockEvents } from "@/lib/mockData";
import { Role } from "@/lib/types";

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
    locationPrivate: undefined
  })) satisfies HQEvent[];
}

async function readDbEvents() {
  const dbEvents = await getPrismaClient().event.findMany({
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
    locationPrivate: event.locationPrivate ?? undefined
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

export async function createEvent(input: {
  title: string;
  startsAt: string;
  publicDetails: string;
  privateDetails?: string;
  visibility: EventVisibility;
  published: boolean;
  locationPublic?: string;
  locationPrivate?: string;
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
      locationPrivate: input.locationPrivate
    }
  });
}
