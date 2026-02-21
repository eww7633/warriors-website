import { hasDatabaseUrl } from "@/lib/db-env";
import { getPrismaClient } from "@/lib/prisma";
import { roster as mockRoster } from "@/lib/mockData";
import { readStore } from "@/lib/hq/store";
import { getUserOpsBadges } from "@/lib/hq/permissions";
import { listLocalPlayerPhotosMapByUserIds } from "@/lib/hq/local-player-photos";

export type PublicRosterProfile = {
  id: string;
  fullName: string;
  jerseyNumber?: number;
  rosterId?: string;
  position?: string;
  status: "active" | "inactive";
  photos: Array<{
    id: string;
    imageUrl: string;
    caption?: string;
    isPrimary: boolean;
    createdAt: string;
  }>;
  stats: {
    tournamentsPlayed: number;
    teamsPlayedOn: number;
    eventsAttended: number;
  };
  opsBadges: string[];
};

export async function listPublicRosterProfiles() {
  if (!hasDatabaseUrl()) {
    const store = await readStore();
    const players = store.users.filter((user) => user.role === "player" && user.status === "approved");
    const photosByUserId = await listLocalPlayerPhotosMapByUserIds(players.map((entry) => entry.id));
    const badges = await Promise.all(players.map((player) => getUserOpsBadges(player.id)));
    return players
      .map((user, index) => ({
        id: user.id,
        fullName: user.fullName,
        jerseyNumber: user.jerseyNumber ?? undefined,
        rosterId: user.rosterId ?? undefined,
        position: user.requestedPosition ?? undefined,
        status: user.activityStatus ?? "active",
        photos: photosByUserId.get(user.id) || [],
        stats: {
          tournamentsPlayed: 0,
          teamsPlayedOn: 0,
          eventsAttended: store.checkIns.filter(
            (entry) =>
              entry.userId === user.id &&
              (entry.attendanceStatus === "checked_in_attended" ||
                entry.attendanceStatus === "walk_in_attended")
          ).length
        },
        opsBadges: badges[index]
      })) satisfies PublicRosterProfile[];
  }

  const users = await getPrismaClient().user.findMany({
    where: {
      role: "player",
      status: "approved"
    },
    include: {
      competitionMemberships: {
        include: {
          team: {
            include: {
              competition: true
            }
          }
        }
      },
      checkIns: true
      ,
      photos: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }]
      }
    },
    orderBy: [{ activityStatus: "asc" }, { fullName: "asc" }]
  });

  const badges = await Promise.all(users.map((user) => getUserOpsBadges(user.id)));
  return users.map((user, index) => {
    const tournamentIds = new Set(
      user.competitionMemberships
        .map((entry) => entry.team.competition)
        .filter((competition) => competition.type === "TOURNAMENT")
        .map((competition) => competition.id)
    );
    const teamIds = new Set(user.competitionMemberships.map((entry) => entry.teamId));
    const eventsAttended = user.checkIns.filter(
      (entry) =>
        entry.attendanceStatus === "checked_in_attended" ||
        entry.attendanceStatus === "walk_in_attended"
    ).length;

    return {
      id: user.id,
      fullName: user.fullName,
      jerseyNumber: user.jerseyNumber ?? undefined,
      rosterId: user.rosterId ?? undefined,
      position: user.requestedPosition ?? undefined,
      status: (user.activityStatus as "active" | "inactive") ?? "active",
      photos: user.photos.map((photo) => ({
        id: photo.id,
        imageUrl: photo.imageUrl,
        caption: photo.caption ?? undefined,
        isPrimary: photo.isPrimary,
        createdAt: photo.createdAt.toISOString()
      })),
      stats: {
        tournamentsPlayed: tournamentIds.size,
        teamsPlayedOn: teamIds.size,
        eventsAttended
      },
      opsBadges: badges[index]
    } satisfies PublicRosterProfile;
  });
}

export function listMockRosterProfiles() {
  return mockRoster.map((entry) => ({
    id: entry.id,
    fullName: entry.name,
    jerseyNumber: undefined,
    rosterId: undefined,
    position: entry.position,
    status: entry.status === "Active" ? "active" : "inactive",
    photos: [],
    stats: {
      tournamentsPlayed: 0,
      teamsPlayedOn: 0,
      eventsAttended: entry.gamesPlayed
    },
    opsBadges: []
  })) satisfies PublicRosterProfile[];
}
