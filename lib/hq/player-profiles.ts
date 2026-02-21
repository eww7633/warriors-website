import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { readStore as readHQStore } from "@/lib/hq/store";
import { hasDatabaseUrl } from "@/lib/db-env";
import { getPrismaClient } from "@/lib/prisma";

export type TeamAssignmentStatus = "active" | "inactive";

export type PlayerAddress = {
  line1?: string;
  line2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
};

export type UsaHockeyStatus = "unverified" | "verified" | "pending_renewal" | "expired";
export type PrimarySubRoster = "gold" | "white" | "black";

export type JerseyOption = {
  number: number;
  displayLabel: string;
  requiresApproval: boolean;
  reason?: string;
};

export type PlayerTeamAssignment = {
  id: string;
  userId: string;
  assignmentType: string;
  seasonLabel?: string;
  sessionLabel?: string;
  subRosterLabel?: string;
  teamName: string;
  startsAt?: string;
  endsAt?: string;
  status: TeamAssignmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type PlayerProfileExtra = {
  userId: string;
  address?: PlayerAddress;
  primarySubRoster?: PrimarySubRoster;
  allowCrossColorJerseyOverlap?: boolean;
  needsEquipment?: boolean;
  usaHockeyNumber?: string;
  usaHockeySeason?: string;
  usaHockeyStatus?: UsaHockeyStatus;
  usaHockeySource?: "manual" | "sportsengine" | "player";
  usaHockeyVerifiedAt?: string;
  usaHockeyExpiresAt?: string;
  playerExperienceSummary?: string;
  codeOfConductAcceptedAt?: string;
  updatedAt: string;
};

type PlayerProfilesStore = {
  profiles: PlayerProfileExtra[];
  teamAssignments: PlayerTeamAssignment[];
};

const defaultStore: PlayerProfilesStore = {
  profiles: [],
  teamAssignments: []
};

function nowIso() {
  return new Date().toISOString();
}

function profileStorePath() {
  if (process.env.PLAYER_PROFILE_STORE_PATH) {
    return process.env.PLAYER_PROFILE_STORE_PATH;
  }
  if (process.env.NODE_ENV === "production") {
    return "/tmp/player-profiles.json";
  }
  return path.join(process.cwd(), "data", "player-profiles.json");
}

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeAddress(input?: PlayerAddress) {
  if (!input) {
    return undefined;
  }
  const normalized: PlayerAddress = {
    line1: normalizeOptionalText(input.line1),
    line2: normalizeOptionalText(input.line2),
    city: normalizeOptionalText(input.city),
    stateProvince: normalizeOptionalText(input.stateProvince),
    postalCode: normalizeOptionalText(input.postalCode),
    country: normalizeOptionalText(input.country)
  };
  const hasAny = Object.values(normalized).some(Boolean);
  return hasAny ? normalized : undefined;
}

function parseProfileFromEquipmentSizes(raw: unknown, userId: string): PlayerProfileExtra {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const blob = root.__profile && typeof root.__profile === "object"
    ? (root.__profile as Record<string, unknown>)
    : {};

  const addressCandidate = blob.address && typeof blob.address === "object"
    ? (blob.address as PlayerAddress)
    : undefined;

  const primarySubRosterRaw = typeof blob.primarySubRoster === "string" ? blob.primarySubRoster : undefined;
  const primarySubRoster =
    primarySubRosterRaw === "gold" || primarySubRosterRaw === "white" || primarySubRosterRaw === "black"
      ? (primarySubRosterRaw as PrimarySubRoster)
      : undefined;

  const usaStatusRaw = typeof blob.usaHockeyStatus === "string" ? blob.usaHockeyStatus : undefined;
  const usaHockeyStatus =
    usaStatusRaw === "unverified" || usaStatusRaw === "verified" || usaStatusRaw === "pending_renewal" || usaStatusRaw === "expired"
      ? (usaStatusRaw as UsaHockeyStatus)
      : undefined;

  const sourceRaw = typeof blob.usaHockeySource === "string" ? blob.usaHockeySource : undefined;
  const usaHockeySource =
    sourceRaw === "manual" || sourceRaw === "sportsengine" || sourceRaw === "player"
      ? sourceRaw
      : undefined;

  return {
    userId,
    address: normalizeAddress(addressCandidate),
    primarySubRoster,
    allowCrossColorJerseyOverlap:
      typeof blob.allowCrossColorJerseyOverlap === "boolean" ? blob.allowCrossColorJerseyOverlap : undefined,
    needsEquipment: typeof blob.needsEquipment === "boolean" ? blob.needsEquipment : undefined,
    usaHockeyNumber: typeof blob.usaHockeyNumber === "string" ? blob.usaHockeyNumber : undefined,
    usaHockeySeason: typeof blob.usaHockeySeason === "string" ? blob.usaHockeySeason : undefined,
    usaHockeyStatus,
    usaHockeySource,
    usaHockeyVerifiedAt: typeof blob.usaHockeyVerifiedAt === "string" ? blob.usaHockeyVerifiedAt : undefined,
    usaHockeyExpiresAt: typeof blob.usaHockeyExpiresAt === "string" ? blob.usaHockeyExpiresAt : undefined,
    playerExperienceSummary: typeof blob.playerExperienceSummary === "string" ? blob.playerExperienceSummary : undefined,
    codeOfConductAcceptedAt: typeof blob.codeOfConductAcceptedAt === "string" ? blob.codeOfConductAcceptedAt : undefined,
    updatedAt: typeof blob.updatedAt === "string" ? blob.updatedAt : nowIso()
  };
}

function writeProfileIntoEquipmentSizes(
  current: unknown,
  profile: PlayerProfileExtra
) {
  const root = current && typeof current === "object" ? { ...(current as Record<string, unknown>) } : {};
  root.__profile = {
    address: profile.address,
    primarySubRoster: profile.primarySubRoster,
    allowCrossColorJerseyOverlap: profile.allowCrossColorJerseyOverlap,
    needsEquipment: profile.needsEquipment,
    usaHockeyNumber: profile.usaHockeyNumber,
    usaHockeySeason: profile.usaHockeySeason,
    usaHockeyStatus: profile.usaHockeyStatus,
    usaHockeySource: profile.usaHockeySource,
    usaHockeyVerifiedAt: profile.usaHockeyVerifiedAt,
    usaHockeyExpiresAt: profile.usaHockeyExpiresAt,
    playerExperienceSummary: profile.playerExperienceSummary,
    codeOfConductAcceptedAt: profile.codeOfConductAcceptedAt,
    updatedAt: profile.updatedAt
  };
  return root;
}

export function usaHockeySeasonLabel(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

export function isUsaHockeyVerifiedForSeason(profile: PlayerProfileExtra | null | undefined, season = usaHockeySeasonLabel()) {
  if (!profile?.usaHockeyNumber) return false;
  if (profile.usaHockeyStatus !== "verified") return false;
  if ((profile.usaHockeySeason || "").trim() !== season) return false;
  if (profile.usaHockeyExpiresAt) {
    const exp = new Date(profile.usaHockeyExpiresAt).getTime();
    if (Number.isFinite(exp) && exp < Date.now()) return false;
  }
  return true;
}

export function usaHockeyEligibilityReason(profile: PlayerProfileExtra | null | undefined, season = usaHockeySeasonLabel()) {
  if (!profile?.usaHockeyNumber) return "missing_number";
  if ((profile.usaHockeySeason || "").trim() !== season) return "season_not_current";
  if (profile.usaHockeyStatus !== "verified") return "not_verified";
  if (profile.usaHockeyExpiresAt) {
    const exp = new Date(profile.usaHockeyExpiresAt).getTime();
    if (Number.isFinite(exp) && exp < Date.now()) return "expired";
  }
  return "eligible";
}

async function ensureStoreFile() {
  const filePath = profileStorePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultStore, null, 2), "utf-8");
    return;
  }

  try {
    const parsed = JSON.parse(await fs.readFile(filePath, "utf-8")) as Partial<PlayerProfilesStore>;
    const normalized: PlayerProfilesStore = {
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
      teamAssignments: Array.isArray(parsed.teamAssignments) ? parsed.teamAssignments : []
    };
    await fs.writeFile(filePath, JSON.stringify(normalized, null, 2), "utf-8");
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

async function readStore() {
  await ensureStoreFile();
  return JSON.parse(await fs.readFile(profileStorePath(), "utf-8")) as PlayerProfilesStore;
}

async function writeStore(store: PlayerProfilesStore) {
  await fs.writeFile(profileStorePath(), JSON.stringify(store, null, 2), "utf-8");
}

function ensureProfile(store: PlayerProfilesStore, userId: string) {
  let profile = store.profiles.find((entry) => entry.userId === userId);
  if (!profile) {
    profile = { userId, updatedAt: nowIso() };
    store.profiles.push(profile);
  }
  return profile;
}

export async function getPlayerProfileExtra(userId: string) {
  if (hasDatabaseUrl()) {
    const user = await getPrismaClient().user.findUnique({
      where: { id: userId },
      select: { id: true, equipmentSizes: true }
    });
    if (!user) {
      return { userId, updatedAt: nowIso() };
    }
    return parseProfileFromEquipmentSizes(user.equipmentSizes, userId);
  }

  const store = await readStore();
  const profile = store.profiles.find((entry) => entry.userId === userId);
  return profile ?? { userId, updatedAt: nowIso() };
}

export async function listPlayerProfileExtras() {
  if (hasDatabaseUrl()) {
    const users = await getPrismaClient().user.findMany({
      select: { id: true, equipmentSizes: true }
    });
    return users.map((user) => parseProfileFromEquipmentSizes(user.equipmentSizes, user.id));
  }

  const store = await readStore();
  return store.profiles;
}

export async function setPlayerUsaHockeyNumber(input: {
  userId: string;
  usaHockeyNumber?: string;
  usaHockeySeason?: string;
  usaHockeyStatus?: UsaHockeyStatus;
  usaHockeySource?: "manual" | "sportsengine" | "player";
  usaHockeyExpiresAt?: string;
}) {
  if (hasDatabaseUrl()) {
    return upsertPlayerContactProfile({
      userId: input.userId,
      usaHockeyNumber: input.usaHockeyNumber,
      usaHockeySeason: input.usaHockeySeason,
      usaHockeyStatus: input.usaHockeyStatus ?? (input.usaHockeyNumber ? "verified" : "unverified"),
      usaHockeySource: input.usaHockeySource,
      usaHockeyExpiresAt: input.usaHockeyExpiresAt
    });
  }

  const store = await readStore();
  const profile = ensureProfile(store, input.userId);
  const number = normalizeOptionalText(input.usaHockeyNumber);
  profile.usaHockeyNumber = number;
  profile.usaHockeySeason = normalizeOptionalText(input.usaHockeySeason) ?? profile.usaHockeySeason;
  profile.usaHockeyStatus =
    input.usaHockeyStatus ?? (number ? "verified" : (profile.usaHockeyStatus ?? "unverified"));
  profile.usaHockeySource = input.usaHockeySource ?? profile.usaHockeySource;
  profile.usaHockeyExpiresAt = normalizeOptionalText(input.usaHockeyExpiresAt) ?? profile.usaHockeyExpiresAt;
  profile.usaHockeyVerifiedAt = number ? nowIso() : profile.usaHockeyVerifiedAt;
  profile.updatedAt = nowIso();
  await writeStore(store);
  return profile;
}

export async function setPlayerAddress(input: {
  userId: string;
  address: PlayerAddress;
}) {
  if (hasDatabaseUrl()) {
    return upsertPlayerContactProfile({
      userId: input.userId,
      address: input.address
    });
  }

  const store = await readStore();
  const profile = ensureProfile(store, input.userId);
  profile.address = normalizeAddress(input.address);
  profile.updatedAt = nowIso();
  await writeStore(store);
  return profile;
}

export async function upsertPlayerContactProfile(input: {
  userId: string;
  address?: PlayerAddress;
  primarySubRoster?: PrimarySubRoster;
  allowCrossColorJerseyOverlap?: boolean;
  needsEquipment?: boolean;
  usaHockeyNumber?: string;
  usaHockeySeason?: string;
  usaHockeyStatus?: UsaHockeyStatus;
  usaHockeySource?: "manual" | "sportsengine" | "player";
  usaHockeyExpiresAt?: string;
  playerExperienceSummary?: string;
  codeOfConductAcceptedAt?: string;
}) {
  if (hasDatabaseUrl()) {
    const user = await getPrismaClient().user.findUnique({
      where: { id: input.userId },
      select: { id: true, equipmentSizes: true }
    });
    if (!user) {
      throw new Error("user_not_found");
    }

    const profile = parseProfileFromEquipmentSizes(user.equipmentSizes, input.userId);
    profile.address = normalizeAddress(input.address) ?? profile.address;
    if (typeof input.primarySubRoster !== "undefined") {
      profile.primarySubRoster = input.primarySubRoster;
    }
    if (typeof input.allowCrossColorJerseyOverlap !== "undefined") {
      profile.allowCrossColorJerseyOverlap = input.allowCrossColorJerseyOverlap;
    }
    if (typeof input.needsEquipment !== "undefined") {
      profile.needsEquipment = input.needsEquipment;
    }
    if (typeof input.usaHockeyNumber !== "undefined") {
      profile.usaHockeyNumber = normalizeOptionalText(input.usaHockeyNumber);
      profile.usaHockeyVerifiedAt = profile.usaHockeyNumber ? nowIso() : profile.usaHockeyVerifiedAt;
    }
    if (typeof input.usaHockeySeason !== "undefined") {
      profile.usaHockeySeason = normalizeOptionalText(input.usaHockeySeason);
    }
    if (typeof input.usaHockeyStatus !== "undefined") {
      profile.usaHockeyStatus = input.usaHockeyStatus;
    }
    if (typeof input.usaHockeySource !== "undefined") {
      profile.usaHockeySource = input.usaHockeySource;
    }
    if (typeof input.usaHockeyExpiresAt !== "undefined") {
      profile.usaHockeyExpiresAt = normalizeOptionalText(input.usaHockeyExpiresAt);
    }
    if (typeof input.playerExperienceSummary !== "undefined") {
      profile.playerExperienceSummary = normalizeOptionalText(input.playerExperienceSummary);
    }
    if (typeof input.codeOfConductAcceptedAt !== "undefined") {
      profile.codeOfConductAcceptedAt = normalizeOptionalText(input.codeOfConductAcceptedAt);
    }
    profile.updatedAt = nowIso();

    await getPrismaClient().user.update({
      where: { id: input.userId },
      data: {
        equipmentSizes: writeProfileIntoEquipmentSizes(user.equipmentSizes, profile)
      }
    });
    return profile;
  }

  const store = await readStore();
  const profile = ensureProfile(store, input.userId);
  profile.address = normalizeAddress(input.address) ?? profile.address;
  if (typeof input.primarySubRoster !== "undefined") {
    profile.primarySubRoster = input.primarySubRoster;
  }
  if (typeof input.allowCrossColorJerseyOverlap !== "undefined") {
    profile.allowCrossColorJerseyOverlap = input.allowCrossColorJerseyOverlap;
  }
  if (typeof input.needsEquipment !== "undefined") {
    profile.needsEquipment = input.needsEquipment;
  }
  if (typeof input.usaHockeyNumber !== "undefined") {
    profile.usaHockeyNumber = normalizeOptionalText(input.usaHockeyNumber);
    profile.usaHockeyVerifiedAt = profile.usaHockeyNumber ? nowIso() : profile.usaHockeyVerifiedAt;
  }
  if (typeof input.usaHockeySeason !== "undefined") {
    profile.usaHockeySeason = normalizeOptionalText(input.usaHockeySeason);
  }
  if (typeof input.usaHockeyStatus !== "undefined") {
    profile.usaHockeyStatus = input.usaHockeyStatus;
  }
  if (typeof input.usaHockeySource !== "undefined") {
    profile.usaHockeySource = input.usaHockeySource;
  }
  if (typeof input.usaHockeyExpiresAt !== "undefined") {
    profile.usaHockeyExpiresAt = normalizeOptionalText(input.usaHockeyExpiresAt);
  }
  if (typeof input.playerExperienceSummary !== "undefined") {
    profile.playerExperienceSummary = normalizeOptionalText(input.playerExperienceSummary);
  }
  if (typeof input.codeOfConductAcceptedAt !== "undefined") {
    profile.codeOfConductAcceptedAt = normalizeOptionalText(input.codeOfConductAcceptedAt);
  }
  profile.updatedAt = nowIso();
  await writeStore(store);
  return profile;
}

export async function listJerseyOptionsForPlayer(input: {
  userId: string;
  currentJerseyNumber?: number;
}) {
  const [hq, profilesStore] = await Promise.all([readHQStore(), readStore()]);
  const self = hq.users.find(
    (entry) => entry.id === input.userId && entry.role === "player" && entry.status === "approved"
  );
  if (!self) {
    return [] as JerseyOption[];
  }

  const profilesByUserId = new Map(profilesStore.profiles.map((entry) => [entry.userId, entry]));
  const selfProfile = profilesByUserId.get(input.userId);
  const selfColor = selfProfile?.primarySubRoster;
  if (!selfColor) {
    return [] as JerseyOption[];
  }

  const overlapAllowed =
    typeof selfProfile.allowCrossColorJerseyOverlap === "boolean"
      ? selfProfile.allowCrossColorJerseyOverlap
      : selfColor === "gold" || selfColor === "black";

  const ownersByNumber = new Map<number, Array<{ fullName: string; color?: PrimarySubRoster }>>();

  for (const user of hq.users) {
    if (
      user.id === self.id ||
      user.role !== "player" ||
      user.status !== "approved" ||
      (user.activityStatus ?? "active") !== "active" ||
      !user.jerseyNumber
    ) {
      continue;
    }
    const ownerColor = profilesByUserId.get(user.id)?.primarySubRoster;
    const list = ownersByNumber.get(user.jerseyNumber) ?? [];
    list.push({ fullName: user.fullName, color: ownerColor });
    ownersByNumber.set(user.jerseyNumber, list);
  }

  const options: JerseyOption[] = [];
  for (let number = 1; number <= 99; number += 1) {
    if (number === input.currentJerseyNumber) {
      continue;
    }
    const owners = ownersByNumber.get(number) ?? [];
    if (owners.length === 0) {
      options.push({ number, displayLabel: `#${number}`, requiresApproval: false });
      continue;
    }

    if (selfColor === "white") {
      continue;
    }

    const sameColorUsed = owners.some((entry) => entry.color === selfColor);
    const whiteUsed = owners.some((entry) => entry.color === "white");
    if (sameColorUsed || whiteUsed) {
      continue;
    }

    const opposite = selfColor === "gold" ? "black" : "gold";
    const oppositeUsed = owners.some((entry) => entry.color === opposite);
    if (oppositeUsed && overlapAllowed) {
      options.push({
        number,
        displayLabel: `#${number} *`,
        requiresApproval: true,
        reason: `Shared with ${opposite} roster; requires Hockey Ops approval.`
      });
    }
  }

  return options;
}

export async function listUsaHockeyRenewalCandidates(input?: { season?: string }) {
  const season = input?.season ?? usaHockeySeasonLabel();
  const store = await readStore();
  return store.profiles
    .filter((profile) => {
      const hasNumber = Boolean(profile.usaHockeyNumber);
      if (!hasNumber) {
        return true;
      }
      if (profile.usaHockeySeason !== season) {
        return true;
      }
      return profile.usaHockeyStatus === "pending_renewal" || profile.usaHockeyStatus === "expired";
    })
    .sort((a, b) => a.userId.localeCompare(b.userId));
}

export async function setUsaHockeyStatus(input: {
  userId: string;
  status: UsaHockeyStatus;
  season?: string;
  number?: string;
  expiresAt?: string;
  source?: "manual" | "sportsengine" | "player";
}) {
  const store = await readStore();
  const profile = ensureProfile(store, input.userId);
  const season = normalizeOptionalText(input.season) ?? usaHockeySeasonLabel();
  const number = normalizeOptionalText(input.number);

  if (typeof input.number !== "undefined") {
    profile.usaHockeyNumber = number;
  }
  profile.usaHockeyStatus = input.status;
  profile.usaHockeySeason = season;
  if (input.status === "verified") {
    profile.usaHockeyVerifiedAt = nowIso();
  }
  if (typeof input.expiresAt !== "undefined") {
    profile.usaHockeyExpiresAt = normalizeOptionalText(input.expiresAt);
  }
  profile.usaHockeySource = input.source ?? "manual";
  profile.updatedAt = nowIso();
  await writeStore(store);
  return profile;
}

export async function runUsaHockeySeasonRollover(input?: { season?: string }) {
  const store = await readStore();
  const season = normalizeOptionalText(input?.season) ?? usaHockeySeasonLabel();
  let updated = 0;

  for (const profile of store.profiles) {
    const hasNumber = Boolean(profile.usaHockeyNumber);
    const staleSeason = profile.usaHockeySeason !== season;
    if (!hasNumber || staleSeason || profile.usaHockeyStatus === "expired") {
      profile.usaHockeySeason = season;
      profile.usaHockeyStatus = hasNumber ? "pending_renewal" : "unverified";
      profile.updatedAt = nowIso();
      updated += 1;
    }
  }

  await writeStore(store);
  return {
    season,
    updated
  };
}

export async function listTeamAssignmentsByUser(userId: string) {
  const store = await readStore();
  return store.teamAssignments
    .filter((entry) => entry.userId === userId)
    .sort((a, b) => {
      const aStart = a.startsAt ? new Date(a.startsAt).getTime() : 0;
      const bStart = b.startsAt ? new Date(b.startsAt).getTime() : 0;
      return bStart - aStart;
    });
}

export async function listAllTeamAssignments() {
  const store = await readStore();
  return store.teamAssignments.slice().sort((a, b) => {
    if (a.userId !== b.userId) {
      return a.userId.localeCompare(b.userId);
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function validateDate(date?: string) {
  if (!date) {
    return undefined;
  }
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("invalid_assignment_date");
  }
  return parsed.toISOString();
}

export async function upsertTeamAssignment(input: {
  assignmentId?: string;
  userId: string;
  assignmentType: string;
  teamName: string;
  seasonLabel?: string;
  sessionLabel?: string;
  subRosterLabel?: string;
  startsAt?: string;
  endsAt?: string;
  status: TeamAssignmentStatus;
  notes?: string;
}) {
  const assignmentType = normalizeOptionalText(input.assignmentType);
  const teamName = normalizeOptionalText(input.teamName);
  if (!assignmentType || !teamName) {
    throw new Error("missing_assignment_fields");
  }
  if (!["active", "inactive"].includes(input.status)) {
    throw new Error("invalid_assignment_status");
  }

  const startsAt = validateDate(normalizeOptionalText(input.startsAt));
  const endsAt = validateDate(normalizeOptionalText(input.endsAt));
  if (startsAt && endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
    throw new Error("assignment_end_before_start");
  }

  const store = await readStore();
  const now = nowIso();
  const assignmentId = normalizeOptionalText(input.assignmentId);
  const existing = assignmentId
    ? store.teamAssignments.find((entry) => entry.id === assignmentId)
    : undefined;

  if (existing) {
    existing.userId = input.userId;
    existing.assignmentType = assignmentType;
    existing.teamName = teamName;
    existing.seasonLabel = normalizeOptionalText(input.seasonLabel);
    existing.sessionLabel = normalizeOptionalText(input.sessionLabel);
    existing.subRosterLabel = normalizeOptionalText(input.subRosterLabel);
    existing.startsAt = startsAt;
    existing.endsAt = endsAt;
    existing.status = input.status;
    existing.notes = normalizeOptionalText(input.notes);
    existing.updatedAt = now;
    await writeStore(store);
    return existing;
  }

  const created: PlayerTeamAssignment = {
    id: crypto.randomUUID(),
    userId: input.userId,
    assignmentType,
    teamName,
    seasonLabel: normalizeOptionalText(input.seasonLabel),
    sessionLabel: normalizeOptionalText(input.sessionLabel),
    subRosterLabel: normalizeOptionalText(input.subRosterLabel),
    startsAt,
    endsAt,
    status: input.status,
    notes: normalizeOptionalText(input.notes),
    createdAt: now,
    updatedAt: now
  };
  store.teamAssignments.push(created);
  await writeStore(store);
  return created;
}

export async function deleteTeamAssignment(assignmentId: string) {
  const store = await readStore();
  const index = store.teamAssignments.findIndex((entry) => entry.id === assignmentId);
  if (index === -1) {
    throw new Error("assignment_not_found");
  }
  const [removed] = store.teamAssignments.splice(index, 1);
  await writeStore(store);
  return removed;
}
