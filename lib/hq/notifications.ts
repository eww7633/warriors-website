import { promises as fs } from "node:fs";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { hasDatabaseUrl } from "@/lib/db-env";
import { getPrismaClient } from "@/lib/prisma";

export type NotificationChannel = "email" | "sms" | "push";
export type NotificationFrequency = "immediate" | "daily" | "weekly" | "off";
export type NotificationCategory =
  | "dvhl"
  | "national"
  | "hockey"
  | "off_ice"
  | "interest_deadline"
  | "interest_roster_finalized"
  | "guest_updates"
  | "news";

export type NotificationPreference = {
  userId: string;
  channels: Record<NotificationChannel, boolean>;
  frequency: NotificationFrequency;
  categories: Record<NotificationCategory, boolean>;
  updatedAt: string;
};

type NotificationStore = {
  preferences: NotificationPreference[];
};

const defaultStore: NotificationStore = {
  preferences: []
};

const defaultCategories: Record<NotificationCategory, boolean> = {
  dvhl: true,
  national: true,
  hockey: true,
  off_ice: true,
  interest_deadline: true,
  interest_roster_finalized: true,
  guest_updates: true,
  news: true
};

function nowIso() {
  return new Date().toISOString();
}

function storePath() {
  if (process.env.NOTIFICATION_STORE_PATH) {
    return process.env.NOTIFICATION_STORE_PATH;
  }
  if (process.env.NODE_ENV === "production") {
    return "/tmp/notification-preferences.json";
  }
  return path.join(process.cwd(), "data", "notification-preferences.json");
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
    const parsed = JSON.parse(await fs.readFile(filePath, "utf-8")) as Partial<NotificationStore>;
    const normalized: NotificationStore = {
      preferences: Array.isArray(parsed.preferences) ? parsed.preferences : []
    };
    await fs.writeFile(filePath, JSON.stringify(normalized, null, 2), "utf-8");
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

async function readStore() {
  await ensureStoreFile();
  return JSON.parse(await fs.readFile(storePath(), "utf-8")) as NotificationStore;
}

async function writeStore(store: NotificationStore) {
  await fs.writeFile(storePath(), JSON.stringify(store, null, 2), "utf-8");
}

function normalizePreference(pref: Partial<NotificationPreference> & { userId: string }): NotificationPreference {
  const channels = pref.channels || { email: true, sms: false, push: false };
  return {
    userId: pref.userId,
    channels: {
      email: Boolean(channels.email),
      sms: Boolean(channels.sms),
      push: Boolean(channels.push)
    },
    frequency: pref.frequency || "immediate",
    categories: {
      ...defaultCategories,
      ...(pref.categories || {})
    },
    updatedAt: pref.updatedAt || nowIso()
  };
}

export async function getNotificationPreference(userId: string) {
  if (hasDatabaseUrl()) {
    const user = await getPrismaClient().user.findUnique({
      where: { id: userId },
      select: { equipmentSizes: true }
    });
    const root = user?.equipmentSizes && typeof user.equipmentSizes === "object"
      ? (user.equipmentSizes as Record<string, unknown>)
      : {};
    const pref = root.__notificationPreference && typeof root.__notificationPreference === "object"
      ? (root.__notificationPreference as Partial<NotificationPreference>)
      : undefined;
    return normalizePreference({ ...(pref || {}), userId });
  }

  const store = await readStore();
  const existing = store.preferences.find((entry) => entry.userId === userId);
  if (!existing) {
    return normalizePreference({ userId });
  }
  return normalizePreference(existing);
}

export async function upsertNotificationPreference(input: {
  userId: string;
  channels?: Partial<Record<NotificationChannel, boolean>>;
  frequency?: NotificationFrequency;
  categories?: Partial<Record<NotificationCategory, boolean>>;
}) {
  if (hasDatabaseUrl()) {
    const user = await getPrismaClient().user.findUnique({
      where: { id: input.userId },
      select: { id: true, equipmentSizes: true }
    });
    if (!user) {
      throw new Error("user_not_found");
    }
    const current = await getNotificationPreference(input.userId);
    const next = normalizePreference({
      ...current,
      userId: input.userId,
      channels: {
        ...current.channels,
        ...(input.channels || {})
      },
      frequency: input.frequency || current.frequency,
      categories: {
        ...current.categories,
        ...(input.categories || {})
      },
      updatedAt: nowIso()
    });
    const root =
      user.equipmentSizes && typeof user.equipmentSizes === "object"
        ? { ...(user.equipmentSizes as Record<string, unknown>) }
        : {};
    root.__notificationPreference = next;
    await getPrismaClient().user.update({
      where: { id: input.userId },
      data: { equipmentSizes: root as Prisma.InputJsonValue }
    });
    return next;
  }

  const store = await readStore();
  const current = normalizePreference(store.preferences.find((entry) => entry.userId === input.userId) || { userId: input.userId });

  const next = normalizePreference({
    ...current,
    userId: input.userId,
    channels: {
      ...current.channels,
      ...(input.channels || {})
    },
    frequency: input.frequency || current.frequency,
    categories: {
      ...current.categories,
      ...(input.categories || {})
    },
    updatedAt: nowIso()
  });

  const idx = store.preferences.findIndex((entry) => entry.userId === input.userId);
  if (idx >= 0) {
    store.preferences[idx] = next;
  } else {
    store.preferences.push(next);
  }

  await writeStore(store);
  return next;
}

export async function canEmailUserForCategory(userId: string, category: NotificationCategory) {
  const pref = await getNotificationPreference(userId);
  if (!pref.channels.email) {
    return false;
  }
  if (pref.frequency !== "immediate") {
    return false;
  }
  return Boolean(pref.categories[category]);
}
