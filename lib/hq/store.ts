import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getPrismaClient } from "@/lib/prisma";
import { CheckInRecord, EquipmentSizes, HQStore, MemberUser } from "@/lib/types";
import { hashPassword, verifyPassword } from "@/lib/hq/password";

import { hasDatabaseUrl } from "@/lib/db-env";

function useDatabaseBackend() {
  return hasDatabaseUrl();
}

function resolvedStorePath() {
  if (process.env.HQ_STORE_PATH) {
    return process.env.HQ_STORE_PATH;
  }

  if (process.env.NODE_ENV === "production") {
    return "/tmp/hq-store.json";
  }

  return path.join(process.cwd(), "data", "hq-store.json");
}

const defaultStore: HQStore = {
  users: [],
  sessions: [],
  checkIns: []
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toEquipmentSizes(raw: unknown): EquipmentSizes {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  return raw as EquipmentSizes;
}

function mapUser(user: {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  requestedPosition: string | null;
  phone: string | null;
  role: string;
  status: string;
  activityStatus: string;
  rosterId: string | null;
  jerseyNumber: number | null;
  equipmentSizes: unknown;
  createdAt: Date;
  updatedAt: Date;
}): MemberUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    passwordHash: user.passwordHash,
    requestedPosition: user.requestedPosition ?? undefined,
    phone: user.phone ?? undefined,
    role: user.role as MemberUser["role"],
    status: user.status as MemberUser["status"],
    activityStatus: (user.activityStatus as MemberUser["activityStatus"]) ?? "active",
    rosterId: user.rosterId ?? undefined,
    jerseyNumber: user.jerseyNumber ?? undefined,
    equipmentSizes: toEquipmentSizes(user.equipmentSizes),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}

async function ensureAdminSeedDb() {
  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL ?? "ops@pghwarriorhockey.us");
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMeNow!";
  const existingAdmin = await getPrismaClient().user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    await getPrismaClient().user.create({
      data: {
        fullName: "Hockey Ops Admin",
        email: adminEmail,
        passwordHash: await hashPassword(adminPassword),
        role: "admin",
        status: "approved",
        activityStatus: "active",
        equipmentSizes: {}
      }
    });
    return;
  }

  const validPassword = await verifyPassword(adminPassword, existingAdmin.passwordHash);
  if (!validPassword.valid || existingAdmin.role !== "admin" || existingAdmin.status !== "approved") {
    await getPrismaClient().user.update({
      where: { id: existingAdmin.id },
      data: {
        fullName: "Hockey Ops Admin",
        passwordHash: await hashPassword(adminPassword),
        role: "admin",
        status: "approved",
        activityStatus: "active"
      }
    });
  }
}

async function ensureStoreFile() {
  const storePath = resolvedStorePath();
  await fs.mkdir(path.dirname(storePath), { recursive: true });

  try {
    await fs.access(storePath);
  } catch {
    await fs.writeFile(storePath, JSON.stringify(defaultStore, null, 2), "utf-8");
  }

  let parsed: HQStore;
  try {
    parsed = JSON.parse(await fs.readFile(storePath, "utf-8")) as HQStore;
  } catch {
    parsed = { ...defaultStore };
    await fs.writeFile(storePath, JSON.stringify(parsed, null, 2), "utf-8");
  }

  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL ?? "ops@pghwarriorhockey.us");
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMeNow!";
  const existingAdmin = parsed.users.find((user) => normalizeEmail(user.email) === adminEmail);

  if (!existingAdmin) {
    parsed.users.push({
      id: crypto.randomUUID(),
      fullName: "Hockey Ops Admin",
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      role: "admin",
      status: "approved",
      activityStatus: "active",
      equipmentSizes: {},
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
    await fs.writeFile(storePath, JSON.stringify(parsed, null, 2), "utf-8");
    return;
  }

  const validPassword = await verifyPassword(adminPassword, existingAdmin.passwordHash);
  if (!validPassword.valid || existingAdmin.role !== "admin" || existingAdmin.status !== "approved") {
    existingAdmin.passwordHash = await hashPassword(adminPassword);
    existingAdmin.role = "admin";
    existingAdmin.status = "approved";
    existingAdmin.activityStatus = "active";
    existingAdmin.updatedAt = nowIso();
    await fs.writeFile(storePath, JSON.stringify(parsed, null, 2), "utf-8");
  }
}

export async function readStore() {
  if (useDatabaseBackend()) {
    try {
      await ensureAdminSeedDb();

      const [users, sessions, checkIns] = await Promise.all([
        getPrismaClient().user.findMany({ orderBy: { createdAt: "asc" } }),
        getPrismaClient().session.findMany({ orderBy: { createdAt: "asc" } }),
        getPrismaClient().checkIn.findMany({ orderBy: { createdAt: "asc" } })
      ]);

      return {
        users: users.map(mapUser),
        sessions: sessions.map((entry) => ({
          token: entry.token,
          userId: entry.userId,
          expiresAt: entry.expiresAt.toISOString()
        })),
        checkIns: checkIns.map((entry) => ({
          id: entry.id,
          userId: entry.userId,
          eventId: entry.eventId,
          checkedInAt: entry.checkedInAt?.toISOString(),
          arrivedAt: entry.arrivedAt?.toISOString(),
          attendanceStatus: entry.attendanceStatus as CheckInRecord["attendanceStatus"],
          note: entry.note ?? undefined
        }))
      } satisfies HQStore;
    } catch {
      const storePath = resolvedStorePath();
      await ensureStoreFile();
      return JSON.parse(await fs.readFile(storePath, "utf-8")) as HQStore;
    }
  }

  const storePath = resolvedStorePath();
  await ensureStoreFile();
  return JSON.parse(await fs.readFile(storePath, "utf-8")) as HQStore;
}

export async function writeStore(store: HQStore) {
  if (useDatabaseBackend()) {
    throw new Error("writeStore is not supported in database mode.");
  }

  const storePath = resolvedStorePath();
  await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf-8");
}

export async function authenticateUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);

  if (useDatabaseBackend()) {
    await ensureAdminSeedDb();
    const user = await getPrismaClient().user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return null;
    }

    const verification = await verifyPassword(password, user.passwordHash);
    if (!verification.valid) {
      return null;
    }

    if (verification.needsRehash) {
      const updated = await getPrismaClient().user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(password) }
      });
      return mapUser(updated);
    }

    return mapUser(user);
  }

  const store = await readStore();
  const user = store.users.find((entry) => normalizeEmail(entry.email) === normalizedEmail);
  if (!user) {
    return null;
  }

  const verification = await verifyPassword(password, user.passwordHash);
  if (!verification.valid) {
    return null;
  }

  if (verification.needsRehash) {
    user.passwordHash = await hashPassword(password);
    user.updatedAt = nowIso();
    await writeStore(store);
  }

  return user;
}

export async function createPendingPlayer(input: {
  fullName: string;
  email: string;
  password: string;
  requestedPosition?: string;
  phone?: string;
}) {
  if (useDatabaseBackend()) {
    await ensureAdminSeedDb();

    const existing = await getPrismaClient().user.findUnique({ where: { email: normalizeEmail(input.email) } });
    if (existing) {
      throw new Error("An account already exists for this email.");
    }

    const created = await getPrismaClient().user.create({
      data: {
        fullName: input.fullName,
        email: normalizeEmail(input.email),
        passwordHash: await hashPassword(input.password),
        requestedPosition: input.requestedPosition,
        phone: input.phone,
        role: "public",
        status: "pending",
        activityStatus: "active",
        equipmentSizes: {}
      }
    });

    await getPrismaClient().contactLead.updateMany({
      where: {
        email: normalizeEmail(input.email),
        linkedUserId: null
      },
      data: {
        linkedUserId: created.id,
        onboardingStatus: "linked",
        linkedAt: new Date()
      }
    });

    return mapUser(created);
  }

  const store = await readStore();
  const existing = store.users.find(
    (user) => normalizeEmail(user.email) === normalizeEmail(input.email)
  );

  if (existing) {
    throw new Error("An account already exists for this email.");
  }

  const user: MemberUser = {
    id: crypto.randomUUID(),
    fullName: input.fullName,
    email: normalizeEmail(input.email),
    passwordHash: await hashPassword(input.password),
    requestedPosition: input.requestedPosition,
    phone: input.phone,
    role: "public",
    status: "pending",
    activityStatus: "active",
    equipmentSizes: {},
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  store.users.push(user);
  await writeStore(store);
  return user;
}

export async function approvePlayer(userId: string, rosterId: string, jerseyNumber?: number) {
  if (useDatabaseBackend()) {
    await ensureAdminSeedDb();
    const user = await getPrismaClient().user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error("Player not found.");
    }

    if (user.status !== "pending") {
      throw new Error("Only pending registrations can be approved.");
    }

    if (typeof jerseyNumber !== "undefined") {
      const jerseyTaken = await getPrismaClient().user.findFirst({
        where: {
          id: { not: userId },
          status: "approved",
          rosterId,
          jerseyNumber
        }
      });

      if (jerseyTaken) {
        throw new Error("Jersey number is already assigned on this roster.");
      }
    }

    const updated = await getPrismaClient().user.update({
      where: { id: userId },
      data: {
        status: "approved",
        role: "player",
        activityStatus: "active",
        rosterId,
        jerseyNumber: jerseyNumber ?? null
      }
    });

    return mapUser(updated);
  }

  const store = await readStore();
  const user = store.users.find((entry) => entry.id === userId);

  if (!user) {
    throw new Error("Player not found.");
  }

  if (user.status !== "pending") {
    throw new Error("Only pending registrations can be approved.");
  }

  if (typeof jerseyNumber !== "undefined") {
    const jerseyTaken = store.users.some(
      (entry) =>
        entry.id !== userId &&
        entry.status === "approved" &&
        entry.rosterId === rosterId &&
        entry.jerseyNumber === jerseyNumber
    );

    if (jerseyTaken) {
      throw new Error("Jersey number is already assigned on this roster.");
    }
  }

  user.status = "approved";
  user.role = "player";
  user.activityStatus = "active";
  user.rosterId = rosterId;
  user.jerseyNumber = jerseyNumber;
  user.updatedAt = nowIso();

  await writeStore(store);
  return user;
}

export async function rejectPlayer(userId: string) {
  if (useDatabaseBackend()) {
    await ensureAdminSeedDb();
    const user = await getPrismaClient().user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error("Player not found.");
    }

    if (user.status !== "pending") {
      throw new Error("Only pending registrations can be rejected.");
    }

    const updated = await getPrismaClient().user.update({
      where: { id: userId },
      data: {
        status: "rejected",
        role: "public",
        rosterId: null,
        jerseyNumber: null
      }
    });

    return mapUser(updated);
  }

  const store = await readStore();
  const user = store.users.find((entry) => entry.id === userId);

  if (!user) {
    throw new Error("Player not found.");
  }

  if (user.status !== "pending") {
    throw new Error("Only pending registrations can be rejected.");
  }

  user.status = "rejected";
  user.role = "public";
  user.rosterId = undefined;
  user.jerseyNumber = undefined;
  user.updatedAt = nowIso();

  await writeStore(store);
  return user;
}

export async function upsertEquipmentSizes(userId: string, sizes: EquipmentSizes) {
  if (useDatabaseBackend()) {
    await ensureAdminSeedDb();
    const updated = await getPrismaClient().user.update({
      where: { id: userId },
      data: { equipmentSizes: sizes }
    });
    return mapUser(updated);
  }

  const store = await readStore();
  const actor = store.users.find((entry) => entry.id === userId);

  if (!actor) {
    throw new Error("Player account not found.");
  }

  actor.equipmentSizes = sizes;
  actor.updatedAt = nowIso();
  await writeStore(store);
  return actor;
}

export async function addCheckInRecord(input: {
  userId: string;
  eventId: string;
  attendanceStatus: CheckInRecord["attendanceStatus"];
  note?: string;
}) {
  const now = new Date();
  const checkedInAt = input.attendanceStatus.startsWith("checked_in") ? now : null;
  const arrivedAt = input.attendanceStatus.includes("attended") ? now : null;

  if (useDatabaseBackend()) {
    await ensureAdminSeedDb();
    const created = await getPrismaClient().checkIn.create({
      data: {
        userId: input.userId,
        eventId: input.eventId,
        attendanceStatus: input.attendanceStatus,
        note: input.note,
        checkedInAt,
        arrivedAt
      }
    });

    return {
      id: created.id,
      userId: created.userId,
      eventId: created.eventId,
      checkedInAt: created.checkedInAt?.toISOString(),
      arrivedAt: created.arrivedAt?.toISOString(),
      attendanceStatus: created.attendanceStatus as CheckInRecord["attendanceStatus"],
      note: created.note ?? undefined
    } satisfies CheckInRecord;
  }

  const store = await readStore();
  const record: CheckInRecord = {
    id: crypto.randomUUID(),
    userId: input.userId,
    eventId: input.eventId,
    checkedInAt: checkedInAt?.toISOString(),
    arrivedAt: arrivedAt?.toISOString(),
    attendanceStatus: input.attendanceStatus,
    note: input.note
  };

  store.checkIns.push(record);
  await writeStore(store);
  return record;
}
