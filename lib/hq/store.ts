import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { HQStore, MemberUser } from "@/lib/types";

const STORE_PATH =
  process.env.HQ_STORE_PATH ??
  (process.env.VERCEL
    ? "/tmp/hq-store.json"
    : path.join(process.cwd(), "data", "hq-store.json"));

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
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });

  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, JSON.stringify(defaultStore, null, 2), "utf-8");
  }

  const parsed = JSON.parse(await fs.readFile(STORE_PATH, "utf-8")) as HQStore;
  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL ?? "ops@pghwarriorhockey.us");
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMeNow!";

  if (!parsed.users.some((user) => normalizeEmail(user.email) === adminEmail)) {
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
    await fs.writeFile(STORE_PATH, JSON.stringify(parsed, null, 2), "utf-8");
  }
}

export async function readStore() {
  await ensureStore();
  return JSON.parse(await fs.readFile(STORE_PATH, "utf-8")) as HQStore;
}

export async function writeStore(store: HQStore) {
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
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
