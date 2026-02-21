import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { hasDatabaseUrl } from "@/lib/db-env";
import { readDbJsonStore, writeDbJsonStore } from "@/lib/hq/db-json-store";

export type MobilePushTriggerType =
  | "rsvp_updated"
  | "reminder_sent"
  | "announcement_sent"
  | "checkin_completed";

export type MobilePushTrigger = {
  id: string;
  type: MobilePushTriggerType;
  actorUserId?: string;
  targetUserId?: string;
  eventId?: string;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  createdAt: string;
  processedAt?: string;
  processingNote?: string;
};

export type MobilePushDeliveryStatus =
  | "delivered"
  | "queued_no_provider"
  | "skipped_pref_disabled"
  | "failed";

export type MobilePushDelivery = {
  id: string;
  triggerId: string;
  targetUserId?: string;
  deviceToken?: string;
  status: MobilePushDeliveryStatus;
  providerResponseCode?: number;
  reason?: string;
  createdAt: string;
};

type MobilePushStore = {
  triggers: MobilePushTrigger[];
  deliveries: MobilePushDelivery[];
};

const defaultStore: MobilePushStore = { triggers: [], deliveries: [] };

function storePath() {
  if (process.env.MOBILE_PUSH_STORE_PATH) {
    return process.env.MOBILE_PUSH_STORE_PATH;
  }
  if (process.env.NODE_ENV === "production") {
    return "/tmp/mobile-push-triggers.json";
  }
  return path.join(process.cwd(), "data", "mobile-push-triggers.json");
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
    const parsed = JSON.parse(await fs.readFile(filePath, "utf-8")) as Partial<MobilePushStore>;
    const normalized: MobilePushStore = {
      triggers: Array.isArray(parsed.triggers) ? parsed.triggers : [],
      deliveries: Array.isArray(parsed.deliveries) ? parsed.deliveries : []
    };
    await fs.writeFile(filePath, JSON.stringify(normalized, null, 2), "utf-8");
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

async function readStore() {
  if (hasDatabaseUrl()) {
    const parsed = await readDbJsonStore<MobilePushStore>("mobilePush", defaultStore);
    return {
      triggers: Array.isArray(parsed.triggers) ? parsed.triggers : [],
      deliveries: Array.isArray(parsed.deliveries) ? parsed.deliveries : []
    };
  }

  await ensureStoreFile();
  return JSON.parse(await fs.readFile(storePath(), "utf-8")) as MobilePushStore;
}

async function writeStore(store: MobilePushStore) {
  if (hasDatabaseUrl()) {
    await writeDbJsonStore("mobilePush", store);
    return;
  }
  await fs.writeFile(storePath(), JSON.stringify(store, null, 2), "utf-8");
}

export async function enqueueMobilePushTrigger(input: {
  type: MobilePushTriggerType;
  actorUserId?: string;
  targetUserId?: string;
  eventId?: string;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
}) {
  const store = await readStore();
  const trigger: MobilePushTrigger = {
    id: crypto.randomUUID(),
    type: input.type,
    actorUserId: input.actorUserId?.trim() || undefined,
    targetUserId: input.targetUserId?.trim() || undefined,
    eventId: input.eventId?.trim() || undefined,
    title: input.title.trim(),
    body: input.body.trim(),
    payload: input.payload,
    createdAt: new Date().toISOString()
  };
  store.triggers.push(trigger);
  if (store.triggers.length > 20000) {
    store.triggers = store.triggers.slice(-20000);
  }
  await writeStore(store);
  return trigger;
}

export async function listPendingMobilePushTriggers(limit = 100) {
  const store = await readStore();
  return store.triggers
    .filter((entry) => !entry.processedAt)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(0, Math.max(1, Math.min(limit, 500)));
}

export async function markMobilePushTriggerProcessed(input: {
  triggerId: string;
  note?: string;
}) {
  const store = await readStore();
  const trigger = store.triggers.find((entry) => entry.id === input.triggerId);
  if (!trigger) return false;
  trigger.processedAt = new Date().toISOString();
  trigger.processingNote = input.note?.trim() || undefined;
  await writeStore(store);
  return true;
}

export async function appendMobilePushDelivery(input: {
  triggerId: string;
  targetUserId?: string;
  deviceToken?: string;
  status: MobilePushDeliveryStatus;
  providerResponseCode?: number;
  reason?: string;
}) {
  const store = await readStore();
  store.deliveries.push({
    id: crypto.randomUUID(),
    triggerId: input.triggerId,
    targetUserId: input.targetUserId?.trim() || undefined,
    deviceToken: input.deviceToken?.trim() || undefined,
    status: input.status,
    providerResponseCode: input.providerResponseCode,
    reason: input.reason?.trim() || undefined,
    createdAt: new Date().toISOString()
  });
  if (store.deliveries.length > 50000) {
    store.deliveries = store.deliveries.slice(-50000);
  }
  await writeStore(store);
}
