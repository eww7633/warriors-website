import { hasDatabaseUrl } from "@/lib/db-env";
import { getPrismaClient } from "@/lib/prisma";
import { games as mockGames, rosters, seasons } from "@/lib/mockData";

type Actor = {
  id: string;
  role: "public" | "player" | "admin";
  status: "pending" | "approved" | "rejected";
};

type SavedLineup = {
  selectedUserIds: string[];
  opponentRoster: string;
  locked: boolean;
  updatedAt: string;
  updatedByUserId: string;
};

const LINEUP_MARKER = "[HQ-LINEUP]";

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
        opponent: game.opponent,
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
        teamMembers: [] as Array<{ id: string; fullName: string; jerseyNumber?: number }>,
        lineup: null as SavedLineup | null,
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
          name: true,
          members: {
            select: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  jerseyNumber: true
                }
              }
            },
            orderBy: {
              user: {
                fullName: "asc"
              }
            }
          }
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
    ...(function () {
      const lineup = extractSavedLineup(row.notes);
      return { lineup };
    })(),
    id: row.id,
    title: `${row.team.name} vs ${row.opponent}`,
    opponent: row.opponent,
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
    teamMembers: row.team.members.map((entry) => ({
      id: entry.user.id,
      fullName: entry.user.fullName,
      jerseyNumber: entry.user.jerseyNumber ?? undefined
    })),
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

function extractSavedLineup(notes?: string | null): SavedLineup | null {
  if (!notes) return null;
  const markerIndex = notes.indexOf(LINEUP_MARKER);
  if (markerIndex < 0) return null;
  const raw = notes.slice(markerIndex + LINEUP_MARKER.length).trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SavedLineup>;
    const selectedUserIds = Array.isArray(parsed.selectedUserIds)
      ? parsed.selectedUserIds.map((entry) => String(entry)).filter(Boolean)
      : [];
    return {
      selectedUserIds,
      opponentRoster: typeof parsed.opponentRoster === "string" ? parsed.opponentRoster : "",
      locked: Boolean(parsed.locked),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
      updatedByUserId: typeof parsed.updatedByUserId === "string" ? parsed.updatedByUserId : "unknown"
    };
  } catch {
    return null;
  }
}

function withSavedLineup(notes: string | null | undefined, lineup: SavedLineup) {
  const base = (notes || "").trim();
  const markerIndex = base.indexOf(LINEUP_MARKER);
  const plain = markerIndex >= 0 ? base.slice(0, markerIndex).trim() : base;
  const payload = `${LINEUP_MARKER}${JSON.stringify(lineup)}`;
  return plain ? `${plain}\n${payload}` : payload;
}

function canScorekeep(actor: Actor, scorekeeperUserId?: string) {
  if (actor.role === "admin") {
    return true;
  }

  return actor.status === "approved" && Boolean(scorekeeperUserId && actor.id === scorekeeperUserId);
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

export async function saveLiveGameLineup(input: {
  actor: Actor;
  gameId: string;
  selectedUserIds: string[];
  opponentRoster?: string;
  locked?: boolean;
}) {
  ensureDbMode();

  const game = await getPrismaClient().competitionGame.findUnique({
    where: { id: input.gameId },
    select: {
      id: true,
      scorekeeperUserId: true,
      notes: true,
      team: {
        select: {
          members: {
            select: {
              userId: true
            }
          }
        }
      }
    }
  });

  if (!game) {
    throw new Error("Game not found.");
  }

  if (!canScorekeep(input.actor, game.scorekeeperUserId ?? undefined)) {
    throw new Error("You do not have scorekeeping permission for this game.");
  }

  const allowed = new Set(game.team.members.map((entry) => entry.userId));
  const selectedUserIds = Array.from(new Set(input.selectedUserIds)).filter((entry) => allowed.has(entry));

  const lineup: SavedLineup = {
    selectedUserIds,
    opponentRoster: (input.opponentRoster || "").trim(),
    locked: Boolean(input.locked),
    updatedAt: new Date().toISOString(),
    updatedByUserId: input.actor.id
  };

  return getPrismaClient().competitionGame.update({
    where: { id: input.gameId },
    data: {
      notes: withSavedLineup(game.notes, lineup)
    }
  });
}
