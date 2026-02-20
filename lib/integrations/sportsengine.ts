import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { upsertPlayerContactProfile, usaHockeySeasonLabel } from "@/lib/hq/player-profiles";
import { readStore } from "@/lib/hq/store";

type SportsEngineWebhookLog = {
  id: string;
  receivedAt: string;
  eventType?: string;
  resourceType?: string;
  operation?: string;
  correlationId?: string;
  payload: unknown;
};

type SportsEngineWebhookStore = {
  logs: SportsEngineWebhookLog[];
};

const defaultStore: SportsEngineWebhookStore = {
  logs: []
};

function webhookStorePath() {
  if (process.env.SPORTSENGINE_WEBHOOK_STORE_PATH) {
    return process.env.SPORTSENGINE_WEBHOOK_STORE_PATH;
  }
  if (process.env.NODE_ENV === "production") {
    return "/tmp/sportsengine-webhooks.json";
  }
  return path.join(process.cwd(), "data", "sportsengine-webhooks.json");
}

async function ensureStoreFile() {
  const filePath = webhookStorePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultStore, null, 2), "utf-8");
    return;
  }
}

async function readWebhookStore() {
  await ensureStoreFile();
  return JSON.parse(await fs.readFile(webhookStorePath(), "utf-8")) as SportsEngineWebhookStore;
}

async function writeWebhookStore(store: SportsEngineWebhookStore) {
  await fs.writeFile(webhookStorePath(), JSON.stringify(store, null, 2), "utf-8");
}

function parseExpectedSignature(secret: string, rawBody: string) {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

function normalizeSig(value: string | null) {
  if (!value) {
    return "";
  }
  return value.replace(/^sha256=/i, "").trim().toLowerCase();
}

export function verifySportsEngineWebhook(rawBody: string, headers: Headers) {
  const secret = (process.env.SPORTSENGINE_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    return true;
  }

  const received =
    normalizeSig(headers.get("x-sportsengine-signature")) ||
    normalizeSig(headers.get("x-signature")) ||
    normalizeSig(headers.get("x-hub-signature-256"));
  const expected = parseExpectedSignature(secret, rawBody);
  if (!received || received.length !== expected.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

async function findUserByEmail(email?: string) {
  const normalizedEmail = (email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }
  const store = await readStore();
  return store.users.find((entry) => entry.email.trim().toLowerCase() === normalizedEmail) ?? null;
}

function extractRegistrationFields(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return {};
  }
  const objectPayload = payload as Record<string, unknown>;
  const data = (objectPayload.data ?? objectPayload.resource ?? objectPayload.entity) as Record<string, unknown> | undefined;
  const root = data ?? objectPayload;

  const email = String(root.email ?? "").trim() || undefined;
  const usaHockeyNumber = String(
    root.usaHockeyNumber ?? root.membershipNumber ?? root.usahNumber ?? root.usa_hockey_number ?? ""
  ).trim() || undefined;
  const season = String(root.usaHockeySeason ?? root.membershipSeason ?? root.season ?? "").trim() || undefined;
  return { email, usaHockeyNumber, season };
}

export async function ingestSportsEngineWebhook(payload: unknown, headers: Headers) {
  const now = new Date().toISOString();
  const objectPayload = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;

  const log: SportsEngineWebhookLog = {
    id: crypto.randomUUID(),
    receivedAt: now,
    eventType: String(objectPayload.eventType ?? objectPayload.type ?? "").trim() || undefined,
    resourceType: String(objectPayload.resourceType ?? objectPayload.resource ?? "").trim() || undefined,
    operation: String(objectPayload.operation ?? objectPayload.action ?? "").trim() || undefined,
    correlationId:
      String(
        headers.get("x-request-id") ||
          objectPayload.correlationId ||
          objectPayload.eventId ||
          objectPayload.id ||
          ""
      ).trim() || undefined,
    payload
  };

  const store = await readWebhookStore();
  store.logs.push(log);
  if (store.logs.length > 300) {
    store.logs = store.logs.slice(-300);
  }
  await writeWebhookStore(store);

  const { email, usaHockeyNumber, season } = extractRegistrationFields(payload);
  if (!email || !usaHockeyNumber) {
    return { updatedUserId: null, logId: log.id, parsed: false };
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return { updatedUserId: null, logId: log.id, parsed: true };
  }

  await upsertPlayerContactProfile({
    userId: user.id,
    usaHockeyNumber,
    usaHockeySeason: season || usaHockeySeasonLabel(),
    usaHockeyStatus: "verified",
    usaHockeySource: "sportsengine"
  });

  return { updatedUserId: user.id, logId: log.id, parsed: true };
}
