import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export type MobileAnalyticsEvent = {
  id: string;
  userId: string;
  name: string;
  eventId?: string;
  screen?: string;
  metadata?: Record<string, unknown>;
  occurredAt: string;
  receivedAt: string;
};

type MobileAnalyticsStore = {
  events: MobileAnalyticsEvent[];
};

const defaultStore: MobileAnalyticsStore = { events: [] };

function storePath() {
  if (process.env.MOBILE_ANALYTICS_STORE_PATH) {
    return process.env.MOBILE_ANALYTICS_STORE_PATH;
  }
  if (process.env.NODE_ENV === "production") {
    return "/tmp/mobile-analytics-events.json";
  }
  return path.join(process.cwd(), "data", "mobile-analytics-events.json");
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
    const parsed = JSON.parse(await fs.readFile(filePath, "utf-8")) as Partial<MobileAnalyticsStore>;
    const normalized: MobileAnalyticsStore = {
      events: Array.isArray(parsed.events) ? parsed.events : []
    };
    await fs.writeFile(filePath, JSON.stringify(normalized, null, 2), "utf-8");
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

async function readStore() {
  await ensureStoreFile();
  return JSON.parse(await fs.readFile(storePath(), "utf-8")) as MobileAnalyticsStore;
}

async function writeStore(store: MobileAnalyticsStore) {
  await fs.writeFile(storePath(), JSON.stringify(store, null, 2), "utf-8");
}

function safeName(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "_")
    .slice(0, 120);
}

export async function trackMobileAnalyticsEvent(input: {
  userId: string;
  name: string;
  eventId?: string;
  screen?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}) {
  const name = safeName(input.name);
  if (!name) {
    throw new Error("analytics_event_name_required");
  }

  const store = await readStore();
  const occurredAt = input.occurredAt ? new Date(input.occurredAt).toISOString() : new Date().toISOString();
  const record: MobileAnalyticsEvent = {
    id: crypto.randomUUID(),
    userId: input.userId,
    name,
    eventId: input.eventId?.trim() || undefined,
    screen: input.screen?.trim() || undefined,
    metadata: input.metadata,
    occurredAt,
    receivedAt: new Date().toISOString()
  };
  store.events.push(record);
  if (store.events.length > 20000) {
    store.events = store.events.slice(-20000);
  }
  await writeStore(store);
  return record;
}
