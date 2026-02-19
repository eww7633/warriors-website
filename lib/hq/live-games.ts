import { hasDatabaseUrl } from "@/lib/db-env";
import { getPrismaClient } from "@/lib/prisma";
import { games as mockGames, rosters, seasons } from "@/lib/mockData";

type Actor = {
  id: string;
  role: "public" | "player" | "admin";
  status: "pending" | "approved" | "rejected";
};

function ensureDbMode() {
  if (!hasDatabaseUrl()) {
    throw new Error("Database mode is required for live scorekeeping.");
  }
}

export async function listLiveGames() {
  if (!hasDatabaseUrl()) {
    return mockGames.map((game) => {
      const season = seasons.find((entry) => entry.id === game.seasonId);
      const roster = rosters.find((entry) => entry.id === game.rosterId);
      return {
        id: game.id,
        title: `${roster?.name ?? "Warriors"} vs ${game.opponent}`,
        startsAt: game.startsAt,
        location: game.location,
        liveStatus: game.status,
        warriorsScore: game.warriorsScore,
        opponentScore: game.opponentScore,
        period: "P1",
        clock: undefined,
        scorekeeperUserId: undefined,
        scorekeeperName: undefined,
        scorekeeperStaffName: undefined,
        competitionTitle: season?.label ?? "Season",
        teamName: roster?.name ?? "Warriors",
        events: game.events.map((event, index) => ({
          id: `${game.id}-${index}`,
          period: undefined,
          clock: event.time,
          team: event.team,
          eventType: event.type,
          note: event.note,
          createdAt: new Date(game.startsAt).toISOString(),
          createdByName: "System"
        }))
      };
    });
  }

  const rows = await getPrismaClient().competitionGame.findMany({
    include: {
      competition: {
        select: {
          title: true,
          type: true
        }
      },
      team: {
        select: {
          name: true
        }
      },
      scorekeeperUser: {
        select: {
          id: true,
          fullName: true
        }
      },
      scorekeeperStaff: {
        select: {
          id: true,
          fullName: true
        }
      },
      events: {
        include: {
          createdByUser: {
            select: {
              fullName: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 30
      }
    },
    orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }]
  });

  return rows.map((row) => ({
    id: row.id,
    title: `${row.team.name} vs ${row.opponent}`,
    startsAt: row.startsAt?.toISOString() ?? row.createdAt.toISOString(),
    location: row.location ?? undefined,
    liveStatus: row.liveStatus,
    warriorsScore: row.warriorsScore,
    opponentScore: row.opponentScore,
    period: row.period,
    clock: row.clock ?? undefined,
    scorekeeperUserId: row.scorekeeperUserId ?? undefined,
    scorekeeperName: row.scorekeeperUser?.fullName ?? undefined,
    scorekeeperStaffName: row.scorekeeperStaff?.fullName ?? undefined,
    competitionTitle: row.competition.title,
    teamName: row.team.name,
    events: row.events.map((event) => ({
      id: event.id,
      period: event.period ?? undefined,
      clock: event.clock ?? undefined,
      team: event.team,
      eventType: event.eventType,
      note: event.note ?? undefined,
      createdAt: event.createdAt.toISOString(),
      createdByName: event.createdByUser.fullName
    }))
  }));
}

function canScorekeep(actor: Actor, scorekeeperUserId?: string) {
  if (actor.role === "admin") {
    return true;
  }

  return actor.role === "player" && actor.status === "approved" && Boolean(scorekeeperUserId && actor.id === scorekeeperUserId);
}

export async function updateLiveGameScore(input: {
  actor: Actor;
  gameId: string;
  warriorsScore: number;
  opponentScore: number;
  period: string;
  clock?: string;
  liveStatus: string;
}) {
  ensureDbMode();

  const game = await getPrismaClient().competitionGame.findUnique({
    where: { id: input.gameId },
    select: { id: true, scorekeeperUserId: true }
  });

  if (!game) {
    throw new Error("Game not found.");
  }

  if (!canScorekeep(input.actor, game.scorekeeperUserId ?? undefined)) {
    throw new Error("You do not have scorekeeping permission for this game.");
  }

  return getPrismaClient().competitionGame.update({
    where: { id: input.gameId },
    data: {
      warriorsScore: Math.max(0, input.warriorsScore),
      opponentScore: Math.max(0, input.opponentScore),
      period: input.period || "P1",
      clock: input.clock || null,
      liveStatus: input.liveStatus || "scheduled",
      status: input.liveStatus || "scheduled"
    }
  });
}

export async function addLiveGameEvent(input: {
  actor: Actor;
  gameId: string;
  period?: string;
  clock?: string;
  team: string;
  eventType: string;
  note?: string;
}) {
  ensureDbMode();

  const game = await getPrismaClient().competitionGame.findUnique({
    where: { id: input.gameId },
    select: { id: true, scorekeeperUserId: true }
  });

  if (!game) {
    throw new Error("Game not found.");
  }

  if (!canScorekeep(input.actor, game.scorekeeperUserId ?? undefined)) {
    throw new Error("You do not have scorekeeping permission for this game.");
  }

  return getPrismaClient().competitionGameEvent.create({
    data: {
      gameId: input.gameId,
      period: input.period || null,
      clock: input.clock || null,
      team: input.team,
      eventType: input.eventType,
      note: input.note || null,
      createdByUserId: input.actor.id
    }
  });
}
