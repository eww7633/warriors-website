import { hasDatabaseUrl } from "@/lib/db-env";
import { getPrismaClient } from "@/lib/prisma";
import { readStore, writeStore } from "@/lib/hq/store";

export type CentralRosterPlayer = {
  id: string;
  fullName: string;
  email: string;
  status: string;
  activityStatus: "active" | "inactive";
  rosterId?: string;
  jerseyNumber?: number;
  competitionHistory: string[];
  createdAt: string;
  updatedAt: string;
};

type JerseyConflict = {
  id: string;
  name: string;
  rosterId?: string;
  sharedTournamentTitles: string[];
};

export async function listCentralRosterPlayers() {
  if (!hasDatabaseUrl()) {
    const store = await readStore();
    return store.users
      .filter((user) => user.role === "player")
      .map((user) => ({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        status: user.status,
        activityStatus: user.activityStatus ?? "active",
        rosterId: user.rosterId,
        jerseyNumber: user.jerseyNumber,
        competitionHistory: [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      })) satisfies CentralRosterPlayer[];
  }

  const users = await getPrismaClient().user.findMany({
    where: { role: "player" },
    orderBy: { fullName: "asc" },
    include: {
      competitionMemberships: {
        include: {
          team: {
            include: {
              competition: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  return users.map((user) => ({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    status: user.status,
    activityStatus: (user.activityStatus as "active" | "inactive") ?? "active",
    rosterId: user.rosterId ?? undefined,
    jerseyNumber: user.jerseyNumber ?? undefined,
    competitionHistory: user.competitionMemberships.map(
      (membership) => `${membership.team.competition.title} - ${membership.team.name}`
    ),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  })) satisfies CentralRosterPlayer[];
}

export async function findJerseyConflict(input: {
  rosterId?: string;
  jerseyNumber?: number;
  excludeUserId: string;
}): Promise<JerseyConflict | null> {
  if (!input.rosterId || !input.jerseyNumber) {
    return null;
  }

  if (!hasDatabaseUrl()) {
    const store = await readStore();
    const conflict = store.users.find(
      (user) =>
        user.id !== input.excludeUserId &&
        user.role === "player" &&
        user.status === "approved" &&
        (user.activityStatus ?? "active") === "active" &&
        user.rosterId === input.rosterId &&
        user.jerseyNumber === input.jerseyNumber
    );

    return conflict
      ? {
          id: conflict.id,
          name: conflict.fullName,
          rosterId: conflict.rosterId,
          sharedTournamentTitles: []
        }
      : null;
  }

  const [actor, conflict] = await Promise.all([
    getPrismaClient().user.findUnique({
      where: { id: input.excludeUserId },
      select: {
        competitionMemberships: {
          select: {
            team: {
              select: {
                competition: {
                  select: {
                    id: true,
                    title: true,
                    type: true
                  }
                }
              }
            }
          }
        }
      }
    }),
    getPrismaClient().user.findFirst({
    where: {
      id: { not: input.excludeUserId },
      role: "player",
      status: "approved",
      activityStatus: "active",
      rosterId: input.rosterId,
      jerseyNumber: input.jerseyNumber
    },
    select: {
      id: true,
      fullName: true,
      rosterId: true,
      competitionMemberships: {
        select: {
          team: {
            select: {
              competition: {
                select: {
                  id: true,
                  title: true,
                  type: true
                }
              }
            }
          }
        }
      }
    }
  })]);

  if (!conflict) {
    return null;
  }

  const actorTournamentIds = new Set(
    (actor?.competitionMemberships ?? [])
      .map((membership) => membership.team.competition)
      .filter((competition) => competition.type === "TOURNAMENT")
      .map((competition) => competition.id)
  );

  const sharedTournamentTitles = Array.from(
    new Set(
      conflict.competitionMemberships
        .map((membership) => membership.team.competition)
        .filter(
          (competition) =>
            competition.type === "TOURNAMENT" && actorTournamentIds.has(competition.id)
        )
        .map((competition) => competition.title)
    )
  );

  return {
    id: conflict.id,
    name: conflict.fullName,
    rosterId: conflict.rosterId ?? undefined,
    sharedTournamentTitles
  };
}

export async function updateCentralRosterPlayer(input: {
  userId: string;
  fullName: string;
  rosterId?: string;
  jerseyNumber?: number;
  activityStatus: "active" | "inactive";
  forceNumberOverlap?: boolean;
}) {
  const normalizedRoster = input.rosterId?.trim() || undefined;
  const normalizedJersey = input.activityStatus === "inactive" ? undefined : input.jerseyNumber;

  const conflict = await findJerseyConflict({
    rosterId: normalizedRoster,
    jerseyNumber: normalizedJersey,
    excludeUserId: input.userId
  });

  if (conflict && !input.forceNumberOverlap) {
    return {
      ok: false as const,
      conflict,
      reason: "number_conflict" as const
    };
  }

  if (conflict && input.forceNumberOverlap && conflict.sharedTournamentTitles.length > 0) {
    return {
      ok: false as const,
      conflict,
      reason: "shared_tournament_overlap" as const
    };
  }

  if (!hasDatabaseUrl()) {
    const store = await readStore();
    const user = store.users.find((entry) => entry.id === input.userId);
    if (!user) {
      throw new Error("Player not found.");
    }

    user.fullName = input.fullName;
    user.rosterId = normalizedRoster;
    user.jerseyNumber = normalizedJersey;
    user.activityStatus = input.activityStatus;
    user.updatedAt = new Date().toISOString();

    await writeStore(store);
    return { ok: true as const };
  }

  await getPrismaClient().user.update({
    where: { id: input.userId },
    data: {
      fullName: input.fullName,
      rosterId: normalizedRoster ?? null,
      jerseyNumber: normalizedJersey ?? null,
      activityStatus: input.activityStatus
    }
  });

  return { ok: true as const };
}

export async function deleteCentralRosterPlayer(userId: string) {
  if (!hasDatabaseUrl()) {
    const store = await readStore();
    const target = store.users.find((entry) => entry.id === userId);
    if (!target || target.role !== "player") {
      throw new Error("Only player records can be deleted from the central roster.");
    }

    store.users = store.users.filter((entry) => entry.id !== userId);
    store.sessions = store.sessions.filter((entry) => entry.userId !== userId);
    store.checkIns = store.checkIns.filter((entry) => entry.userId !== userId);
    await writeStore(store);
    return;
  }

  const target = await getPrismaClient().user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  if (!target || target.role !== "player") {
    throw new Error("Only player records can be deleted from the central roster.");
  }

  await getPrismaClient().user.delete({ where: { id: userId } });
}
