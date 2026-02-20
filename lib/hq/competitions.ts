import { hasDatabaseUrl } from "@/lib/db-env";
import { getPrismaClient } from "@/lib/prisma";

type TournamentTeamKey = "gold" | "white" | "black";

type CompetitionType = "TOURNAMENT" | "SINGLE_GAME" | "DVHL";

function ensureDbMode() {
  if (!hasDatabaseUrl()) {
    throw new Error("Database mode is required for competition management.");
  }
}

function parseOptionalDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date.");
  }

  return parsed;
}

export async function createTournament(input: {
  title: string;
  startsAt?: string;
  includeTeams: TournamentTeamKey[];
  notes?: string;
}) {
  ensureDbMode();

  if (input.includeTeams.length === 0) {
    throw new Error("At least one team is required for a tournament.");
  }

  const teamDefs = input.includeTeams.map((key) => ({
    name: key.toUpperCase(),
    colorTag: key,
    rosterMode: "TOURNAMENT"
  }));

  return getPrismaClient().competition.create({
    data: {
      title: input.title,
      type: "TOURNAMENT",
      startsAt: parseOptionalDate(input.startsAt),
      notes: input.notes,
      teams: {
        create: teamDefs
      }
    },
    include: {
      teams: true
    }
  });
}

export async function createSingleGame(input: {
  title: string;
  startsAt?: string;
  teamName: string;
  rosterMode: "gold" | "black" | "mixed";
  notes?: string;
}) {
  ensureDbMode();

  return getPrismaClient().competition.create({
    data: {
      title: input.title,
      type: "SINGLE_GAME",
      startsAt: parseOptionalDate(input.startsAt),
      notes: input.notes,
      teams: {
        create: [
          {
            name: input.teamName,
            colorTag: input.rosterMode,
            rosterMode: "SINGLE_GAME"
          }
        ]
      }
    },
    include: {
      teams: true
    }
  });
}

export async function createDvhl(input: {
  title: string;
  startsAt?: string;
  teamNames: [string, string, string, string];
  notes?: string;
}) {
  ensureDbMode();

  const trimmedNames = input.teamNames.map((name) => name.trim());
  if (trimmedNames.some((name) => !name)) {
    throw new Error("DVHL requires four team names.");
  }

  return getPrismaClient().competition.create({
    data: {
      title: input.title,
      type: "DVHL",
      startsAt: parseOptionalDate(input.startsAt),
      notes: input.notes,
      teams: {
        create: trimmedNames.map((name) => ({
          name,
          rosterMode: "DVHL_DRAFT"
        }))
      }
    },
    include: {
      teams: true
    }
  });
}

export async function addTeamToCompetition(input: {
  competitionId: string;
  name: string;
  colorTag?: string;
  rosterMode?: string;
}) {
  ensureDbMode();

  const competition = await getPrismaClient().competition.findUnique({
    where: { id: input.competitionId },
    select: { id: true, type: true }
  });

  if (!competition) {
    throw new Error("Competition not found.");
  }

  return getPrismaClient().competitionTeam.create({
    data: {
      competitionId: competition.id,
      name: input.name,
      colorTag: input.colorTag || undefined,
      rosterMode: input.rosterMode || (competition.type === "DVHL" ? "DVHL_DRAFT" : undefined)
    }
  });
}

export async function removeCompetitionTeam(input: { teamId: string }) {
  ensureDbMode();

  return getPrismaClient().competitionTeam.delete({
    where: { id: input.teamId }
  });
}

export async function listCompetitions() {
  if (!hasDatabaseUrl()) {
    return [];
  }

  return getPrismaClient().competition.findMany({
    orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
    include: {
      teams: {
        include: {
          games: {
            include: {
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
                orderBy: { createdAt: "desc" },
                take: 20
              }
            },
            orderBy: { startsAt: "asc" }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true
                }
              }
            }
          }
        }
      }
      ,
      games: {
        orderBy: { startsAt: "asc" }
      }
    }
  });
}

export async function addCompetitionGameForTeam(input: {
  teamId: string;
  opponent: string;
  startsAt?: string;
  location?: string;
  notes?: string;
  scorekeeperUserId?: string;
  scorekeeperStaffId?: string;
}) {
  ensureDbMode();

  const team = await getPrismaClient().competitionTeam.findUnique({
    where: { id: input.teamId }
  });

  if (!team) {
    throw new Error("Competition team not found.");
  }

  return getPrismaClient().competitionGame.create({
    data: {
      competitionId: team.competitionId,
      teamId: team.id,
      opponent: input.opponent,
      startsAt: parseOptionalDate(input.startsAt),
      location: input.location,
      notes: input.notes,
      scorekeeperUserId: input.scorekeeperUserId || null,
      scorekeeperStaffId: input.scorekeeperStaffId || null
    }
  });
}

export async function assignGameScorekeeper(input: {
  gameId: string;
  scorekeeperType: "none" | "player" | "staff";
  scorekeeperUserId?: string;
  scorekeeperStaffId?: string;
}) {
  ensureDbMode();

  if (input.scorekeeperType === "player") {
    if (!input.scorekeeperUserId) {
      throw new Error("Select a player to assign as scorekeeper.");
    }

    const user = await getPrismaClient().user.findUnique({
      where: { id: input.scorekeeperUserId },
      select: { role: true, status: true }
    });

    if (!user || (user.role !== "player" && user.role !== "admin") || user.status !== "approved") {
      throw new Error("Scorekeeper must be an approved player or admin.");
    }

    return getPrismaClient().competitionGame.update({
      where: { id: input.gameId },
      data: {
        scorekeeperUserId: input.scorekeeperUserId,
        scorekeeperStaffId: null
      }
    });
  }

  if (input.scorekeeperType === "staff") {
    if (!input.scorekeeperStaffId) {
      throw new Error("Select a staff member to assign as scorekeeper.");
    }

    return getPrismaClient().competitionGame.update({
      where: { id: input.gameId },
      data: {
        scorekeeperStaffId: input.scorekeeperStaffId,
        scorekeeperUserId: null
      }
    });
  }

  return getPrismaClient().competitionGame.update({
    where: { id: input.gameId },
    data: {
      scorekeeperStaffId: null,
      scorekeeperUserId: null
    }
  });
}

export async function assignPlayerToCompetitionTeam(input: { teamId: string; userId: string }) {
  ensureDbMode();

  const user = await getPrismaClient().user.findUnique({ where: { id: input.userId } });
  if (!user || (user.role !== "player" && user.role !== "admin") || user.status !== "approved") {
    throw new Error("Only approved player/admin accounts can be assigned to competition teams.");
  }

  return getPrismaClient().competitionTeamMember.upsert({
    where: {
      teamId_userId: {
        teamId: input.teamId,
        userId: input.userId
      }
    },
    update: {},
    create: {
      teamId: input.teamId,
      userId: input.userId
    }
  });
}

export async function removePlayerFromCompetitionTeam(input: { teamId: string; userId: string }) {
  ensureDbMode();

  return getPrismaClient().competitionTeamMember.delete({
    where: {
      teamId_userId: {
        teamId: input.teamId,
        userId: input.userId
      }
    }
  });
}

export async function listEligiblePlayers() {
  if (!hasDatabaseUrl()) {
    return [];
  }

  return getPrismaClient().user.findMany({
    where: {
      status: "approved",
      OR: [{ role: "player" }, { role: "admin" }]
    },
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      rosterId: true,
      jerseyNumber: true
    }
  });
}

export function competitionTypeLabel(type: CompetitionType) {
  if (type === "TOURNAMENT") return "Tournament";
  if (type === "SINGLE_GAME") return "Single Game";
  return "DVHL";
}
