import { promises as fs } from "node:fs";
import path from "node:path";

export type EventSignupMode = "straight_rsvp" | "interest_gathering";

export type EventSignupConfig = {
  eventId: string;
  signupMode: EventSignupMode;
  interestClosesAt?: string;
  targetRosterSize?: number;
  heroImageUrl?: string;
  thumbnailImageUrl?: string;
  allowGuestRequests?: boolean;
  guestCostEnabled?: boolean;
  guestCostLabel?: string;
  guestCostAmountUsd?: number;
  updatedAt: string;
  updatedByUserId?: string;
};

export type EventRosterSelection = {
  eventId: string;
  selectedUserIds: string[];
  updatedAt: string;
  updatedByUserId: string;
};

export type EventGuestIntent = {
  eventId: string;
  userId: string;
  wantsGuest: boolean;
  guestCount: number;
  note?: string;
  updatedAt: string;
};

type EventSignupStore = {
  configs: EventSignupConfig[];
  selections: EventRosterSelection[];
  guestIntents: EventGuestIntent[];
};

const defaultStore: EventSignupStore = {
  configs: [],
  selections: [],
  guestIntents: []
};

function nowIso() {
  return new Date().toISOString();
}

function resolvedStorePath() {
  if (process.env.EVENT_SIGNUP_STORE_PATH) {
    return process.env.EVENT_SIGNUP_STORE_PATH;
  }

  if (process.env.NODE_ENV === "production") {
    return "/tmp/event-signups.json";
  }

  return path.join(process.cwd(), "data", "event-signups.json");
}

async function ensureStoreFile() {
  const storePath = resolvedStorePath();
  await fs.mkdir(path.dirname(storePath), { recursive: true });

  try {
    await fs.access(storePath);
  } catch {
    await fs.writeFile(storePath, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

async function readEventSignupStore(): Promise<EventSignupStore> {
  const storePath = resolvedStorePath();
  await ensureStoreFile();

  try {
    const parsed = JSON.parse(await fs.readFile(storePath, "utf-8")) as EventSignupStore;
    return {
      configs: Array.isArray(parsed.configs) ? parsed.configs : [],
      selections: Array.isArray(parsed.selections) ? parsed.selections : [],
      guestIntents: Array.isArray(parsed.guestIntents) ? parsed.guestIntents : []
    };
  } catch {
    return { ...defaultStore };
  }
}

async function writeEventSignupStore(store: EventSignupStore) {
  const storePath = resolvedStorePath();
  await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf-8");
}

function normalizeMode(raw?: string): EventSignupMode {
  return raw === "interest_gathering" ? "interest_gathering" : "straight_rsvp";
}

export function isDvhlEvent(eventTypeName?: string) {
  return (eventTypeName || "").toLowerCase().includes("dvhl");
}

function normalizeIsoDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

export function isInterestSignupClosed(config?: EventSignupConfig) {
  if (!config || config.signupMode !== "interest_gathering" || !config.interestClosesAt) {
    return false;
  }
  return new Date(config.interestClosesAt).getTime() <= Date.now();
}

export function canEventCollectGuests(config: EventSignupConfig | undefined, eventTypeName?: string) {
  if (!config) return false;
  if (isDvhlEvent(eventTypeName)) return false;
  return Boolean(config.allowGuestRequests);
}

export async function getEventSignupConfigMap(eventIds: string[]) {
  if (eventIds.length === 0) {
    return {} as Record<string, EventSignupConfig>;
  }

  const store = await readEventSignupStore();
  const idSet = new Set(eventIds);
  const map: Record<string, EventSignupConfig> = {};

  for (const entry of store.configs) {
    if (!idSet.has(entry.eventId)) continue;
    map[entry.eventId] = {
      ...entry,
      signupMode: normalizeMode(entry.signupMode),
      interestClosesAt: normalizeIsoDate(entry.interestClosesAt),
      targetRosterSize:
        typeof entry.targetRosterSize === "number" && entry.targetRosterSize > 0
          ? Math.floor(entry.targetRosterSize)
          : undefined,
      heroImageUrl: entry.heroImageUrl?.trim() || undefined,
      thumbnailImageUrl: entry.thumbnailImageUrl?.trim() || undefined,
      allowGuestRequests: Boolean(entry.allowGuestRequests),
      guestCostEnabled: Boolean(entry.guestCostEnabled),
      guestCostLabel: entry.guestCostLabel?.trim() || undefined,
      guestCostAmountUsd:
        typeof entry.guestCostAmountUsd === "number" && entry.guestCostAmountUsd >= 0
          ? entry.guestCostAmountUsd
          : undefined
    };
  }

  return map;
}

export async function getEventSignupConfig(eventId: string) {
  const map = await getEventSignupConfigMap([eventId]);
  return map[eventId];
}

export async function upsertEventSignupConfig(input: {
  eventId: string;
  signupMode?: string;
  interestClosesAt?: string;
  targetRosterSize?: number;
  heroImageUrl?: string;
  thumbnailImageUrl?: string;
  allowGuestRequests?: boolean;
  guestCostEnabled?: boolean;
  guestCostLabel?: string;
  guestCostAmountUsd?: number;
  updatedByUserId?: string;
}) {
  const store = await readEventSignupStore();
  const nextMode = normalizeMode(input.signupMode);
  const nextClosesAt = normalizeIsoDate(input.interestClosesAt);
  const nextRosterSize =
    typeof input.targetRosterSize === "number" && input.targetRosterSize > 0
      ? Math.floor(input.targetRosterSize)
      : undefined;
  const guestCostAmountUsd =
    typeof input.guestCostAmountUsd === "number" && input.guestCostAmountUsd >= 0
      ? input.guestCostAmountUsd
      : undefined;
  const allowGuestRequests = Boolean(input.allowGuestRequests);
  const guestCostEnabled = allowGuestRequests && Boolean(input.guestCostEnabled);

  const existingIndex = store.configs.findIndex((entry) => entry.eventId === input.eventId);
  const next: EventSignupConfig = {
    eventId: input.eventId,
    signupMode: nextMode,
    interestClosesAt: nextMode === "interest_gathering" ? nextClosesAt : undefined,
    targetRosterSize: nextMode === "interest_gathering" ? nextRosterSize : undefined,
    heroImageUrl: input.heroImageUrl?.trim() || undefined,
    thumbnailImageUrl: input.thumbnailImageUrl?.trim() || undefined,
    allowGuestRequests,
    guestCostEnabled,
    guestCostLabel: guestCostEnabled ? input.guestCostLabel?.trim() || undefined : undefined,
    guestCostAmountUsd: guestCostEnabled ? guestCostAmountUsd : undefined,
    updatedAt: nowIso(),
    updatedByUserId: input.updatedByUserId
  };

  if (existingIndex >= 0) {
    store.configs[existingIndex] = next;
  } else {
    store.configs.push(next);
  }

  if (nextMode !== "interest_gathering") {
    store.selections = store.selections.filter((entry) => entry.eventId !== input.eventId);
  }

  await writeEventSignupStore(store);
  return next;
}

export async function deleteEventSignupConfig(eventId: string) {
  const store = await readEventSignupStore();
  store.configs = store.configs.filter((entry) => entry.eventId !== eventId);
  store.selections = store.selections.filter((entry) => entry.eventId !== eventId);
  store.guestIntents = store.guestIntents.filter((entry) => entry.eventId !== eventId);
  await writeEventSignupStore(store);
}

export async function getEventRosterSelectionMap(eventIds: string[]) {
  if (eventIds.length === 0) {
    return {} as Record<string, EventRosterSelection>;
  }

  const store = await readEventSignupStore();
  const idSet = new Set(eventIds);
  const map: Record<string, EventRosterSelection> = {};

  for (const entry of store.selections) {
    if (!idSet.has(entry.eventId)) continue;
    map[entry.eventId] = entry;
  }

  return map;
}

export async function setEventRosterSelection(input: {
  eventId: string;
  selectedUserIds: string[];
  updatedByUserId: string;
}) {
  const store = await readEventSignupStore();
  const uniqueIds = Array.from(new Set(input.selectedUserIds.map((entry) => entry.trim()).filter(Boolean)));

  const next: EventRosterSelection = {
    eventId: input.eventId,
    selectedUserIds: uniqueIds,
    updatedAt: nowIso(),
    updatedByUserId: input.updatedByUserId
  };

  const index = store.selections.findIndex((entry) => entry.eventId === input.eventId);
  if (index >= 0) {
    store.selections[index] = next;
  } else {
    store.selections.push(next);
  }

  await writeEventSignupStore(store);
  return next;
}

export async function getEventGuestIntentMap(eventIds: string[]) {
  if (eventIds.length === 0) {
    return {} as Record<string, EventGuestIntent[]>;
  }

  const store = await readEventSignupStore();
  const idSet = new Set(eventIds);
  const map: Record<string, EventGuestIntent[]> = {};

  for (const eventId of eventIds) {
    map[eventId] = [];
  }

  for (const entry of store.guestIntents) {
    if (!idSet.has(entry.eventId)) continue;
    map[entry.eventId].push(entry);
  }

  return map;
}

export async function getViewerGuestIntent(eventId: string, userId: string) {
  const map = await getEventGuestIntentMap([eventId]);
  return (map[eventId] || []).find((entry) => entry.userId === userId);
}

export async function upsertEventGuestIntent(input: {
  eventId: string;
  userId: string;
  wantsGuest: boolean;
  guestCount?: number;
  note?: string;
}) {
  const store = await readEventSignupStore();
  const guestCount = input.wantsGuest ? Math.max(1, Math.min(10, Math.floor(input.guestCount || 1))) : 0;
  const next: EventGuestIntent = {
    eventId: input.eventId,
    userId: input.userId,
    wantsGuest: input.wantsGuest,
    guestCount,
    note: input.note?.trim() || undefined,
    updatedAt: nowIso()
  };

  const idx = store.guestIntents.findIndex(
    (entry) => entry.eventId === input.eventId && entry.userId === input.userId
  );
  if (idx >= 0) {
    store.guestIntents[idx] = next;
  } else {
    store.guestIntents.push(next);
  }

  await writeEventSignupStore(store);
  return next;
}
