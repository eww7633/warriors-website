import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { hasDatabaseUrl } from "@/lib/db-env";
import { readDbJsonStore, writeDbJsonStore } from "@/lib/hq/db-json-store";

export type MobileDevicePlatform = "ios" | "android" | "web";

export type MobileDeviceToken = {
  id: string;
  userId: string;
  token: string;
  platform: MobileDevicePlatform;
  appVersion?: string;
  deviceLabel?: string;
  createdAt: string;
  updatedAt: string;
};

type MobileDeviceTokenStore = {
  tokens: MobileDeviceToken[];
};

const defaultStore: MobileDeviceTokenStore = {
  tokens: []
};

function storePath() {
  if (process.env.MOBILE_DEVICE_TOKEN_STORE_PATH) {
    return process.env.MOBILE_DEVICE_TOKEN_STORE_PATH;
  }
  if (process.env.NODE_ENV === "production") {
    return "/tmp/mobile-device-tokens.json";
  }
  return path.join(process.cwd(), "data", "mobile-device-tokens.json");
}

function nowIso() {
  return new Date().toISOString();
}

function normalizePlatform(input?: string): MobileDevicePlatform {
  if (input === "ios" || input === "android" || input === "web") return input;
  return "ios";
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
    const parsed = JSON.parse(await fs.readFile(filePath, "utf-8")) as Partial<MobileDeviceTokenStore>;
    const normalized: MobileDeviceTokenStore = {
      tokens: Array.isArray(parsed.tokens) ? parsed.tokens : []
    };
    await fs.writeFile(filePath, JSON.stringify(normalized, null, 2), "utf-8");
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

async function readStore() {
  if (hasDatabaseUrl()) {
    const parsed = await readDbJsonStore<MobileDeviceTokenStore>("mobileDeviceTokens", defaultStore);
    return {
      tokens: Array.isArray(parsed.tokens) ? parsed.tokens : []
    };
  }

  await ensureStoreFile();
  return JSON.parse(await fs.readFile(storePath(), "utf-8")) as MobileDeviceTokenStore;
}

async function writeStore(store: MobileDeviceTokenStore) {
  if (hasDatabaseUrl()) {
    await writeDbJsonStore("mobileDeviceTokens", store);
    return;
  }
  await fs.writeFile(storePath(), JSON.stringify(store, null, 2), "utf-8");
}

export async function upsertMobileDeviceToken(input: {
  userId: string;
  token: string;
  platform?: string;
  appVersion?: string;
  deviceLabel?: string;
}) {
  const token = input.token.trim();
  if (!token) {
    throw new Error("device_token_required");
  }

  const store = await readStore();
  const existing = store.tokens.find((entry) => entry.token === token);
  if (existing) {
    existing.userId = input.userId;
    existing.platform = normalizePlatform(input.platform);
    existing.appVersion = input.appVersion?.trim() || undefined;
    existing.deviceLabel = input.deviceLabel?.trim() || undefined;
    existing.updatedAt = nowIso();
    await writeStore(store);
    return existing;
  }

  const created: MobileDeviceToken = {
    id: crypto.randomUUID(),
    userId: input.userId,
    token,
    platform: normalizePlatform(input.platform),
    appVersion: input.appVersion?.trim() || undefined,
    deviceLabel: input.deviceLabel?.trim() || undefined,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  store.tokens.push(created);
  await writeStore(store);
  return created;
}

export async function removeMobileDeviceToken(input: { token: string; userId?: string }) {
  const token = input.token.trim();
  if (!token) return false;
  const store = await readStore();
  const before = store.tokens.length;
  store.tokens = store.tokens.filter(
    (entry) => !(entry.token === token && (!input.userId || entry.userId === input.userId))
  );
  await writeStore(store);
  return store.tokens.length < before;
}

export async function listMobileDeviceTokensByUser(userId: string) {
  const store = await readStore();
  return store.tokens.filter((entry) => entry.userId === userId);
}
