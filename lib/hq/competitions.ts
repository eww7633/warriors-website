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

    if (!user || user.status !== "approved") {
      throw new Error("Scorekeeper must be an approved HQ user.");
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

export async function replaceDvhlSchedule(input: {
  competitionId: string;
  clearExisting: boolean;
  weeks: Array<{
    weekNumber: number;
    games: Array<{
      homeTeamId: string;
      awayTeamId: string;
      startsAt?: string;
      location?: string;
    }>;
  }>;
}) {
  ensureDbMode();

  const competition = await getPrismaClient().competition.findUnique({
    where: { id: input.competitionId },
    include: {
      teams: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  if (!competition || competition.type !== "DVHL") {
    throw new Error("DVHL competition not found.");
  }

  const teamById = new Map(competition.teams.map((team) => [team.id, team]));

  if (input.clearExisting) {
    await getPrismaClient().competitionGame.deleteMany({
      where: { competitionId: input.competitionId }
    });
  }

  let created = 0;

  for (const week of input.weeks) {
    for (const game of week.games) {
      if (!game.homeTeamId || !game.awayTeamId || game.homeTeamId === game.awayTeamId) {
        continue;
      }

      const homeTeam = teamById.get(game.homeTeamId);
      const awayTeam = teamById.get(game.awayTeamId);
      if (!homeTeam || !awayTeam) {
        continue;
      }

      await getPrismaClient().competitionGame.create({
        data: {
          competitionId: input.competitionId,
          teamId: homeTeam.id,
          opponent: awayTeam.name,
          startsAt: parseOptionalDate(game.startsAt),
          location: game.location || undefined,
          notes: `[DVHL-SCHED] week ${week.weekNumber}`
        }
      });
      created += 1;
    }
  }

  return { created };
}

export async function resolveDvhlPlayoffWeekEightFromSemis(input: {
  competitionId: string;
  finalStartsAt?: string;
  finalLocation?: string;
  toiletStartsAt?: string;
  toiletLocation?: string;
}) {
  ensureDbMode();

  const competition = await getPrismaClient().competition.findUnique({
    where: { id: input.competitionId },
    include: {
      teams: true,
      games: {
        include: {
          team: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }]
      }
    }
  });

  if (!competition || competition.type !== "DVHL") {
    throw new Error("DVHL competition not found.");
  }

  const teamByName = new Map(competition.teams.map((team) => [team.name, team]));
  const week7Games = competition.games
    .filter((game) => (game.notes || "").includes("[DVHL-SCHED] week 7"))
    .slice(0, 2);

  if (week7Games.length < 2) {
    throw new Error("Need two Week 7 semifinal games before generating Week 8.");
  }

  const semis = week7Games.map((game) => {
    const homeTeam = teamByName.get(game.team.name);
    const awayTeam = teamByName.get(game.opponent);
    if (!homeTeam || !awayTeam) {
      throw new Error("Could not map semifinal teams from game records.");
    }
    if (game.warriorsScore === game.opponentScore) {
      throw new Error("Semifinal games must have a winner before generating Week 8.");
    }
    const winner = game.warriorsScore > game.opponentScore ? homeTeam : awayTeam;
    const loser = game.warriorsScore > game.opponentScore ? awayTeam : homeTeam;
    return { winner, loser };
  });

  const week8Existing = competition.games.filter((game) => (game.notes || "").includes("[DVHL-SCHED] week 8"));
  const existingFinal = week8Existing.find((game) => (game.notes || "").includes("playoff:defenders-cup")) || week8Existing[0];
  const existingToilet = week8Existing.find((game) => (game.notes || "").includes("playoff:toilet-bowl")) || week8Existing[1];

  await getPrismaClient().competitionGame.deleteMany({
    where: {
      competitionId: input.competitionId,
      notes: {
        contains: "[DVHL-SCHED] week 8"
      }
    }
  });

  const finalStartsAt = parseOptionalDate(input.finalStartsAt) ?? existingFinal?.startsAt ?? undefined;
  const toiletStartsAt = parseOptionalDate(input.toiletStartsAt) ?? existingToilet?.startsAt ?? finalStartsAt;
  const finalLocation = input.finalLocation || existingFinal?.location || undefined;
  const toiletLocation = input.toiletLocation || existingToilet?.location || finalLocation;

  await getPrismaClient().competitionGame.create({
    data: {
      competitionId: input.competitionId,
      teamId: semis[0].winner.id,
      opponent: semis[1].winner.name,
      startsAt: finalStartsAt,
      location: finalLocation,
      notes: "[DVHL-SCHED] week 8 | playoff:defenders-cup"
    }
  });

  await getPrismaClient().competitionGame.create({
    data: {
      competitionId: input.competitionId,
      teamId: semis[0].loser.id,
      opponent: semis[1].loser.name,
      startsAt: toiletStartsAt,
      location: toiletLocation,
      notes: "[DVHL-SCHED] week 8 | playoff:toilet-bowl"
    }
  });

  return { generated: 2 };
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

export async function listEligibleScorekeepers() {
  if (!hasDatabaseUrl()) {
    return [];
  }

  return getPrismaClient().user.findMany({
    where: {
      status: "approved"
    },
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true
    }
  });
}

export function competitionTypeLabel(type: CompetitionType) {
  if (type === "TOURNAMENT") return "Tournament";
  if (type === "SINGLE_GAME") return "Single Game";
  return "DVHL";
}
