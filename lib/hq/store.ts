import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { HQStore, MemberUser } from "@/lib/types";

function resolvedStorePath() {
  if (process.env.HQ_STORE_PATH) {
    return process.env.HQ_STORE_PATH;
  }

  // In production/serverless runtimes, /tmp is typically the only writable path.
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

export function hashPassword(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function ensureStore() {
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
    const adminUser: MemberUser = {
      id: crypto.randomUUID(),
      fullName: "Hockey Ops Admin",
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      role: "admin",
      status: "approved",
      equipmentSizes: {},
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    parsed.users.push(adminUser);
    await fs.writeFile(storePath, JSON.stringify(parsed, null, 2), "utf-8");
    return;
  }

  const nextHash = hashPassword(adminPassword);
  if (existingAdmin.passwordHash !== nextHash || existingAdmin.role !== "admin" || existingAdmin.status !== "approved") {
    existingAdmin.passwordHash = nextHash;
    existingAdmin.role = "admin";
    existingAdmin.status = "approved";
    existingAdmin.updatedAt = nowIso();
    await fs.writeFile(storePath, JSON.stringify(parsed, null, 2), "utf-8");
  }
}

export async function readStore() {
  const storePath = resolvedStorePath();
  await ensureStore();
  return JSON.parse(await fs.readFile(storePath, "utf-8")) as HQStore;
}

export async function writeStore(store: HQStore) {
  const storePath = resolvedStorePath();
  await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf-8");
}

export async function findUserByEmail(email: string) {
  const store = await readStore();
  return store.users.find((user) => normalizeEmail(user.email) === normalizeEmail(email));
}

export async function createPendingPlayer(input: {
  fullName: string;
  email: string;
  password: string;
  requestedPosition?: string;
  phone?: string;
}) {
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
    passwordHash: hashPassword(input.password),
    requestedPosition: input.requestedPosition,
    phone: input.phone,
    role: "public",
    status: "pending",
    equipmentSizes: {},
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  store.users.push(user);
  await writeStore(store);
  return user;
}

export async function approvePlayer(userId: string, rosterId: string, jerseyNumber: number) {
  const store = await readStore();
  const user = store.users.find((entry) => entry.id === userId);

  if (!user) {
    throw new Error("Player not found.");
  }

  if (user.status !== "pending") {
    throw new Error("Only pending registrations can be approved.");
  }

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

  user.status = "approved";
  user.role = "player";
  user.rosterId = rosterId;
  user.jerseyNumber = jerseyNumber;
  user.updatedAt = nowIso();

  await writeStore(store);
  return user;
}

export async function rejectPlayer(userId: string) {
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
