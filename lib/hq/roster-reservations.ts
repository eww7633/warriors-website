import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { MemberUser } from "@/lib/types";
import { hasDatabaseUrl } from "@/lib/db-env";
import { readDbJsonStore, writeDbJsonStore } from "@/lib/hq/db-json-store";

export type RosterReservation = {
  id: string;
  fullName: string;
  normalizedFullName: string;
  email?: string;
  phone?: string;
  rosterId: string;
  primarySubRoster?: "gold" | "white" | "black";
  jerseyNumber: number;
  usaHockeyNumber?: string;
  notes?: string;
  source?: string;
  linkedUserId?: string;
  linkedAt?: string;
  createdAt: string;
  updatedAt: string;
};

type RosterReservationStore = {
  reservations: RosterReservation[];
};

const defaultStore: RosterReservationStore = {
  reservations: []
};

function nowIso() {
  return new Date().toISOString();
}

function storePath() {
  if (process.env.ROSTER_RESERVATION_STORE_PATH) {
    return process.env.ROSTER_RESERVATION_STORE_PATH;
  }
  if (process.env.NODE_ENV === "production") {
    return "/tmp/roster-reservations.json";
  }
  return path.join(process.cwd(), "data", "roster-reservations.json");
}

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeEmail(value?: string) {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalized.toLowerCase() : undefined;
}

function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ");
}

async function ensureStoreFile() {
  const filePath = storePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultStore, null, 2), "utf-8");
    return;
  }

  try {
    const parsed = JSON.parse(await fs.readFile(filePath, "utf-8")) as Partial<RosterReservationStore>;
    const normalized: RosterReservationStore = {
      reservations: Array.isArray(parsed.reservations) ? parsed.reservations : []
    };
    await fs.writeFile(filePath, JSON.stringify(normalized, null, 2), "utf-8");
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

async function readStore() {
  if (hasDatabaseUrl()) {
    const parsed = await readDbJsonStore<RosterReservationStore>("rosterReservations", defaultStore);
    return {
      reservations: Array.isArray(parsed.reservations) ? parsed.reservations : []
    };
  }

  await ensureStoreFile();
  return JSON.parse(await fs.readFile(storePath(), "utf-8")) as RosterReservationStore;
}

async function writeStore(store: RosterReservationStore) {
  if (hasDatabaseUrl()) {
    await writeDbJsonStore("rosterReservations", store);
    return;
  }

  await fs.writeFile(storePath(), JSON.stringify(store, null, 2), "utf-8");
}

export async function listRosterReservations() {
  const store = await readStore();
  return [...store.reservations].sort((a, b) => {
    if (a.rosterId !== b.rosterId) {
      return a.rosterId.localeCompare(b.rosterId);
    }
    if (a.jerseyNumber !== b.jerseyNumber) {
      return a.jerseyNumber - b.jerseyNumber;
    }
    return a.fullName.localeCompare(b.fullName);
  });
}

export async function findRosterReservationById(id: string) {
  const store = await readStore();
  return store.reservations.find((entry) => entry.id === id);
}

export async function findBlockingRosterReservation(input: {
  rosterId: string;
  jerseyNumber: number;
  candidateUserId?: string;
  candidateEmail?: string;
  candidateFullName?: string;
}) {
  const store = await readStore();
  const normalizedCandidateEmail = normalizeEmail(input.candidateEmail);
  const normalizedCandidateName = input.candidateFullName ? normalizeName(input.candidateFullName) : undefined;
  const match = store.reservations.find(
    (entry) => entry.rosterId === input.rosterId && entry.jerseyNumber === input.jerseyNumber
  );
  if (!match) {
    return null;
  }
  if (input.candidateUserId && match.linkedUserId === input.candidateUserId) {
    return null;
  }
  if (normalizedCandidateEmail && match.email && match.email === normalizedCandidateEmail) {
    return null;
  }
  if (normalizedCandidateName && match.normalizedFullName === normalizedCandidateName) {
    return null;
  }
  return match;
}

export async function upsertRosterReservations(
  rows: Array<{
    fullName: string;
    email?: string;
    phone?: string;
    rosterId: string;
    primarySubRoster?: "gold" | "white" | "black";
    jerseyNumber: number;
    usaHockeyNumber?: string;
    notes?: string;
  }>,
  options?: {
    source?: string;
    autoLinkUsers?: MemberUser[];
  }
) {
  const store = await readStore();
  const created: RosterReservation[] = [];
  const updated: RosterReservation[] = [];
  const skipped: string[] = [];

  for (const row of rows) {
    const fullName = normalizeOptionalText(row.fullName);
    const rosterId = normalizeOptionalText(row.rosterId);
    if (!fullName || !rosterId || !Number.isFinite(row.jerseyNumber) || row.jerseyNumber < 1 || row.jerseyNumber > 99) {
      skipped.push(row.fullName || "unknown");
      continue;
    }
    const existing = store.reservations.find(
      (entry) => entry.rosterId === rosterId && entry.jerseyNumber === row.jerseyNumber
    );
    const matchingUser = options?.autoLinkUsers?.find(
      (user) =>
        (row.email && user.email.toLowerCase() === row.email.toLowerCase()) ||
        normalizeName(user.fullName) === normalizeName(fullName)
    );
    if (existing) {
      existing.fullName = fullName;
      existing.normalizedFullName = normalizeName(fullName);
      existing.email = normalizeEmail(row.email);
      existing.phone = normalizeOptionalText(row.phone);
      existing.primarySubRoster = row.primarySubRoster;
      existing.usaHockeyNumber = normalizeOptionalText(row.usaHockeyNumber);
      existing.notes = normalizeOptionalText(row.notes);
      existing.source = normalizeOptionalText(options?.source);
      existing.linkedUserId = existing.linkedUserId || matchingUser?.id;
      existing.linkedAt = existing.linkedUserId ? nowIso() : existing.linkedAt;
      existing.updatedAt = nowIso();
      updated.push(existing);
      continue;
    }

    const next: RosterReservation = {
      id: crypto.randomUUID(),
      fullName,
      normalizedFullName: normalizeName(fullName),
      email: normalizeEmail(row.email),
      phone: normalizeOptionalText(row.phone),
      rosterId,
      primarySubRoster: row.primarySubRoster,
      jerseyNumber: row.jerseyNumber,
      usaHockeyNumber: normalizeOptionalText(row.usaHockeyNumber),
      notes: normalizeOptionalText(row.notes),
      source: normalizeOptionalText(options?.source),
      linkedUserId: matchingUser?.id,
      linkedAt: matchingUser ? nowIso() : undefined,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    store.reservations.push(next);
    created.push(next);
  }

  await writeStore(store);
  return { created, updated, skipped };
}

export async function linkRosterReservationToUser(input: { reservationId: string; user: MemberUser }) {
  const store = await readStore();
  const reservation = store.reservations.find((entry) => entry.id === input.reservationId);
  if (!reservation) {
    throw new Error("reservation_not_found");
  }
  reservation.linkedUserId = input.user.id;
  reservation.linkedAt = nowIso();
  reservation.updatedAt = nowIso();
  await writeStore(store);
  return reservation;
}

export async function linkMatchingReservationForUser(input: {
  user: MemberUser;
  rosterId?: string;
  jerseyNumber?: number;
}) {
  const store = await readStore();
  const normalizedEmail = normalizeEmail(input.user.email);
  const normalizedName = normalizeName(input.user.fullName);
  const reservation = store.reservations.find((entry) => {
    if (entry.linkedUserId && entry.linkedUserId !== input.user.id) {
      return false;
    }
    if (typeof input.jerseyNumber === "number" && entry.jerseyNumber !== input.jerseyNumber) {
      return false;
    }
    if (input.rosterId && entry.rosterId !== input.rosterId) {
      return false;
    }
    if (normalizedEmail && entry.email && entry.email === normalizedEmail) {
      return true;
    }
    return entry.normalizedFullName === normalizedName;
  });

  if (!reservation) {
    return null;
  }
  reservation.linkedUserId = input.user.id;
  reservation.linkedAt = nowIso();
  reservation.updatedAt = nowIso();
  await writeStore(store);
  return reservation;
}
