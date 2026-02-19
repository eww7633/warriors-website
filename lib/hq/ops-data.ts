import { hasDatabaseUrl } from "@/lib/db-env";
import { getPrismaClient } from "@/lib/prisma";

function requireDatabaseMode() {
  if (!hasDatabaseUrl()) {
    throw new Error("Sports data management requires DATABASE_URL.");
  }
}

export async function listSportsData() {
  if (!hasDatabaseUrl()) {
    return {
      seasons: [],
      teams: [],
      venues: [],
      positions: [],
      staff: [],
      sponsors: []
    };
  }

  const [seasons, teams, venues, positions, staff, sponsors] = await Promise.all([
    getPrismaClient().season.findMany({ orderBy: [{ isActive: "desc" }, { startsAt: "desc" }] }),
    getPrismaClient().team.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: { season: true }
    }),
    getPrismaClient().venue.findMany({ orderBy: { name: "asc" } }),
    getPrismaClient().position.findMany({ orderBy: { code: "asc" } }),
    getPrismaClient().staffProfile.findMany({
      orderBy: [{ isActive: "desc" }, { fullName: "asc" }]
    }),
    getPrismaClient().sponsor.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }]
    })
  ]);

  return { seasons, teams, venues, positions, staff, sponsors };
}

export async function createSeason(input: {
  label: string;
  startsAt?: string;
  endsAt?: string;
  isActive: boolean;
  isArchived: boolean;
}) {
  requireDatabaseMode();

  if (input.isActive) {
    await getPrismaClient().season.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });
  }

  return getPrismaClient().season.create({
    data: {
      label: input.label,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      isActive: input.isActive,
      isArchived: input.isArchived
    }
  });
}

export async function createTeam(input: {
  name: string;
  code?: string;
  colorTag?: string;
  level?: string;
  seasonId?: string;
  isActive: boolean;
}) {
  requireDatabaseMode();
  return getPrismaClient().team.create({
    data: {
      name: input.name,
      code: input.code || null,
      colorTag: input.colorTag || null,
      level: input.level || null,
      seasonId: input.seasonId || null,
      isActive: input.isActive
    }
  });
}

export async function createVenue(input: {
  name: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  mapUrl?: string;
}) {
  requireDatabaseMode();
  return getPrismaClient().venue.create({
    data: {
      name: input.name,
      address1: input.address1 || null,
      city: input.city || null,
      state: input.state || null,
      postalCode: input.postalCode || null,
      mapUrl: input.mapUrl || null
    }
  });
}

export async function createPosition(input: { code: string; label: string }) {
  requireDatabaseMode();
  return getPrismaClient().position.create({
    data: {
      code: input.code.toUpperCase(),
      label: input.label
    }
  });
}

export async function createStaffProfile(input: {
  fullName: string;
  email?: string;
  phone?: string;
  jobTitle: string;
  bio?: string;
  isActive: boolean;
}) {
  requireDatabaseMode();
  return getPrismaClient().staffProfile.create({
    data: {
      fullName: input.fullName,
      email: input.email || null,
      phone: input.phone || null,
      jobTitle: input.jobTitle,
      bio: input.bio || null,
      isActive: input.isActive
    }
  });
}

export async function createSponsor(input: {
  name: string;
  websiteUrl?: string;
  logoUrl?: string;
  notes?: string;
  isActive: boolean;
}) {
  requireDatabaseMode();
  return getPrismaClient().sponsor.create({
    data: {
      name: input.name,
      websiteUrl: input.websiteUrl || null,
      logoUrl: input.logoUrl || null,
      notes: input.notes || null,
      isActive: input.isActive
    }
  });
}

export async function listPublicSponsors() {
  if (!hasDatabaseUrl()) {
    return [];
  }

  const sponsors = await getPrismaClient().sponsor.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" }
  });

  if (sponsors.length > 0) {
    await getPrismaClient().sponsor.updateMany({
      where: { id: { in: sponsors.map((entry) => entry.id) } },
      data: { impressions: { increment: 1 } }
    });
  }

  return sponsors;
}

export async function registerSponsorClick(id: string) {
  if (!hasDatabaseUrl()) {
    return;
  }

  await getPrismaClient().sponsor.update({
    where: { id },
    data: { clicks: { increment: 1 } }
  });
}
