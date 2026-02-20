import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { hasDatabaseUrl } from "@/lib/db-env";
import { getPrismaClient } from "@/lib/prisma";
import { readStore } from "@/lib/hq/store";

type ContactOnboardingStatus = "imported" | "invited" | "linked";

type FallbackContactLead = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  onboardingStatus: ContactOnboardingStatus;
  tags: string | null;
  notes: string | null;
  linkedUserId: string | null;
  invitedAt: string | null;
  linkedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ContactLeadStore = {
  leads: FallbackContactLead[];
};

const defaultContactLeadStore: ContactLeadStore = {
  leads: []
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeEmail(value?: string | null) {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeName(value?: string | null) {
  if (!value) return "";
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contactLeadStorePath() {
  if (process.env.CONTACT_LEAD_STORE_PATH) {
    return process.env.CONTACT_LEAD_STORE_PATH;
  }
  if (process.env.NODE_ENV === "production") {
    return "/tmp/contact-leads.json";
  }
  return path.join(process.cwd(), "data", "contact-leads.json");
}

async function ensureContactLeadStoreFile() {
  const filePath = contactLeadStorePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultContactLeadStore, null, 2), "utf-8");
    return;
  }

  try {
    const parsed = JSON.parse(await fs.readFile(filePath, "utf-8")) as Partial<ContactLeadStore>;
    const normalized: ContactLeadStore = {
      leads: Array.isArray(parsed.leads) ? parsed.leads : []
    };
    await fs.writeFile(filePath, JSON.stringify(normalized, null, 2), "utf-8");
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultContactLeadStore, null, 2), "utf-8");
  }
}

async function readContactLeadStore() {
  await ensureContactLeadStoreFile();
  return JSON.parse(await fs.readFile(contactLeadStorePath(), "utf-8")) as ContactLeadStore;
}

async function writeContactLeadStore(store: ContactLeadStore) {
  await fs.writeFile(contactLeadStorePath(), JSON.stringify(store, null, 2), "utf-8");
}

function requireDatabaseMode() {
  if (!hasDatabaseUrl()) {
    throw new Error("Sports data management requires DATABASE_URL.");
  }
}

async function enrichFallbackLeadWithLinkedUser(lead: FallbackContactLead) {
  if (!lead.linkedUserId) {
    return { ...lead, linkedUser: null };
  }

  const store = await readStore();
  const linkedUser = store.users.find((entry) => entry.id === lead.linkedUserId) || null;
  return {
    ...lead,
    linkedUser: linkedUser
      ? {
          id: linkedUser.id,
          email: linkedUser.email,
          fullName: linkedUser.fullName,
          role: linkedUser.role,
          status: linkedUser.status
        }
      : null
  };
}

async function listFallbackContactLeads() {
  const store = await readContactLeadStore();
  const enriched = await Promise.all(store.leads.map((lead) => enrichFallbackLeadWithLinkedUser(lead)));
  return enriched.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listSportsData() {
  if (!hasDatabaseUrl()) {
    const contactLeads = await listFallbackContactLeads();
    return {
      seasons: [],
      teams: [],
      venues: [],
      positions: [],
      staff: [],
      sponsors: [],
      contactLeads,
      contactLeadStats: {
        total: contactLeads.length,
        imported: contactLeads.filter((lead) => lead.onboardingStatus === "imported").length,
        invited: contactLeads.filter((lead) => lead.onboardingStatus === "invited").length,
        linked: contactLeads.filter((lead) => lead.onboardingStatus === "linked").length
      }
    };
  }

  const [seasons, teams, venues, positions, staff, sponsors, contactLeads] = await Promise.all([
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
    }),
    getPrismaClient().contactLead.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        linkedUser: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            status: true
          }
        }
      }
    })
  ]);

  const contactLeadStats = {
    total: contactLeads.length,
    imported: contactLeads.filter((lead) => lead.onboardingStatus === "imported").length,
    invited: contactLeads.filter((lead) => lead.onboardingStatus === "invited").length,
    linked: contactLeads.filter((lead) => lead.onboardingStatus === "linked").length
  };

  return { seasons, teams, venues, positions, staff, sponsors, contactLeads, contactLeadStats };
}

export async function getContactLeadById(contactLeadId: string) {
  if (hasDatabaseUrl()) {
    return getPrismaClient().contactLead.findUnique({
      where: { id: contactLeadId },
      include: {
        linkedUser: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            status: true
          }
        }
      }
    });
  }

  const store = await readContactLeadStore();
  const lead = store.leads.find((entry) => entry.id === contactLeadId);
  if (!lead) return null;
  return enrichFallbackLeadWithLinkedUser(lead);
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

export async function markContactLeadInvited(contactLeadId: string) {
  if (hasDatabaseUrl()) {
    await getPrismaClient().contactLead.update({
      where: { id: contactLeadId },
      data: {
        onboardingStatus: "invited",
        invitedAt: new Date()
      }
    });
    return;
  }

  const store = await readContactLeadStore();
  const lead = store.leads.find((entry) => entry.id === contactLeadId);
  if (!lead) {
    throw new Error("Contact not found.");
  }
  lead.onboardingStatus = "invited";
  lead.invitedAt = nowIso();
  lead.updatedAt = nowIso();
  await writeContactLeadStore(store);
}

export async function linkContactLeadToMatchingUser(contactLeadId: string) {
  if (hasDatabaseUrl()) {
    const lead = await getPrismaClient().contactLead.findUnique({
      where: { id: contactLeadId },
      select: { email: true }
    });

    if (!lead?.email) {
      throw new Error("Contact lead has no email to match.");
    }

    const user = await getPrismaClient().user.findUnique({
      where: { email: lead.email.toLowerCase() },
      select: { id: true }
    });

    if (!user) {
      throw new Error("No user account exists for that email yet.");
    }

    await getPrismaClient().contactLead.update({
      where: { id: contactLeadId },
      data: {
        linkedUserId: user.id,
        onboardingStatus: "linked",
        linkedAt: new Date()
      }
    });
    return;
  }

  const store = await readContactLeadStore();
  const lead = store.leads.find((entry) => entry.id === contactLeadId);
  if (!lead) {
    throw new Error("Contact not found.");
  }

  if (!lead.email) {
    throw new Error("Contact lead has no email to match.");
  }

  const hqStore = await readStore();
  const user = hqStore.users.find((entry) => entry.email.toLowerCase() === lead.email!.toLowerCase());
  if (!user) {
    throw new Error("No user account exists for that email yet.");
  }

  lead.linkedUserId = user.id;
  lead.onboardingStatus = "linked";
  lead.linkedAt = nowIso();
  lead.updatedAt = nowIso();
  await writeContactLeadStore(store);
}

export async function importContactLeads(input: {
  source?: string;
  rows: Array<{
    fullName?: string;
    email?: string;
    phone?: string;
    tags?: string;
    notes?: string;
  }>;
}) {
  const source = (input.source || "wix").trim() || "wix";
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  if (hasDatabaseUrl()) {
    for (const row of input.rows) {
      const fullName = normalizeOptionalText(row.fullName);
      const email = normalizeEmail(row.email);
      const phone = normalizeOptionalText(row.phone);
      const tags = normalizeOptionalText(row.tags);
      const notes = normalizeOptionalText(row.notes);

      if (!fullName && !email) {
        skipped += 1;
        continue;
      }

      if (email) {
        const existing = await getPrismaClient().contactLead.findFirst({
          where: { email },
          orderBy: { createdAt: "desc" }
        });

        if (existing) {
          await getPrismaClient().contactLead.update({
            where: { id: existing.id },
            data: {
              fullName: fullName || existing.fullName,
              phone: phone || existing.phone,
              tags: tags || existing.tags,
              notes: notes || existing.notes,
              source
            }
          });
          updated += 1;
          continue;
        }
      }

      await getPrismaClient().contactLead.create({
        data: {
          fullName,
          email,
          phone,
          source,
          onboardingStatus: "imported",
          tags,
          notes
        }
      });
      imported += 1;
    }

    return { imported, updated, skipped };
  }

  const store = await readContactLeadStore();

  for (const row of input.rows) {
    const fullName = normalizeOptionalText(row.fullName);
    const email = normalizeEmail(row.email);
    const phone = normalizeOptionalText(row.phone);
    const tags = normalizeOptionalText(row.tags);
    const notes = normalizeOptionalText(row.notes);

    if (!fullName && !email) {
      skipped += 1;
      continue;
    }

    const existing = store.leads.find((entry) => {
      if (email && entry.email && entry.email === email) {
        return true;
      }
      if (fullName && normalizeName(entry.fullName) === normalizeName(fullName)) {
        return true;
      }
      return false;
    });

    if (existing) {
      existing.fullName = fullName || existing.fullName;
      existing.email = email || existing.email;
      existing.phone = phone || existing.phone;
      existing.tags = tags || existing.tags;
      existing.notes = notes || existing.notes;
      existing.source = source;
      existing.updatedAt = nowIso();
      updated += 1;
      continue;
    }

    store.leads.push({
      id: crypto.randomUUID(),
      fullName,
      email,
      phone,
      source,
      onboardingStatus: "imported",
      tags,
      notes,
      linkedUserId: null,
      invitedAt: null,
      linkedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
    imported += 1;
  }

  await writeContactLeadStore(store);
  return { imported, updated, skipped };
}
