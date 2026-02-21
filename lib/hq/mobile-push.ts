import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

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
};

type MobilePushStore = {
  triggers: MobilePushTrigger[];
};

const defaultStore: MobilePushStore = { triggers: [] };

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
      triggers: Array.isArray(parsed.triggers) ? parsed.triggers : []
    };
    await fs.writeFile(filePath, JSON.stringify(normalized, null, 2), "utf-8");
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

async function readStore() {
  await ensureStoreFile();
  return JSON.parse(await fs.readFile(storePath(), "utf-8")) as MobilePushStore;
}

async function writeStore(store: MobilePushStore) {
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
