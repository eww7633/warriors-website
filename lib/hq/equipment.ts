import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { hasDatabaseUrl } from "@/lib/db-env";
import { readDbJsonStore, writeDbJsonStore } from "@/lib/hq/db-json-store";

export type EquipmentCondition = "new" | "good" | "fair" | "needs_repair";
export type EquipmentRequestStatus = "submitted" | "approved" | "ready" | "picked_up" | "returned" | "denied";

export type EquipmentItem = {
  id: string;
  name: string;
  category: string;
  size?: string;
  quantityTotal: number;
  quantityAvailable: number;
  condition: EquipmentCondition;
  locationBin?: string;
  photoUrl?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EquipmentRequest = {
  id: string;
  userId: string;
  itemId?: string;
  itemName: string;
  sizeNeeded?: string;
  urgency?: "low" | "normal" | "high";
  notes?: string;
  status: EquipmentRequestStatus;
  reviewNotes?: string;
  reviewedByUserId?: string;
  assignedItemLabel?: string;
  createdAt: string;
  updatedAt: string;
};

type EquipmentStore = {
  items: EquipmentItem[];
  requests: EquipmentRequest[];
};

const defaultStore: EquipmentStore = {
  items: [],
  requests: []
};

function nowIso() {
  return new Date().toISOString();
}

function storePath() {
  if (process.env.EQUIPMENT_STORE_PATH) {
    return process.env.EQUIPMENT_STORE_PATH;
  }
  if (process.env.NODE_ENV === "production") {
    return "/tmp/equipment.json";
  }
  return path.join(process.cwd(), "data", "equipment.json");
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
    const parsed = JSON.parse(await fs.readFile(filePath, "utf-8")) as Partial<EquipmentStore>;
    const normalized: EquipmentStore = {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      requests: Array.isArray(parsed.requests) ? parsed.requests : []
    };
    await fs.writeFile(filePath, JSON.stringify(normalized, null, 2), "utf-8");
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

async function readStore() {
  if (hasDatabaseUrl()) {
    const parsed = await readDbJsonStore<EquipmentStore>("equipment", defaultStore);
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      requests: Array.isArray(parsed.requests) ? parsed.requests : []
    };
  }

  await ensureStoreFile();
  return JSON.parse(await fs.readFile(storePath(), "utf-8")) as EquipmentStore;
}

async function writeStore(store: EquipmentStore) {
  if (hasDatabaseUrl()) {
    await writeDbJsonStore("equipment", store);
    return;
  }

  await fs.writeFile(storePath(), JSON.stringify(store, null, 2), "utf-8");
}

export async function listEquipmentItems() {
  const store = await readStore();
  return store.items.slice().sort((a, b) => a.name.localeCompare(b.name));
}

export async function listEquipmentRequests() {
  const store = await readStore();
  return store.requests.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function listEquipmentRequestsByUser(userId: string) {
  const store = await readStore();
  return store.requests
    .filter((entry) => entry.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function normalizeCondition(input?: string): EquipmentCondition {
  if (input === "new" || input === "good" || input === "fair" || input === "needs_repair") {
    return input;
  }
  return "good";
}

export async function upsertEquipmentItem(input: {
  itemId?: string;
  name: string;
  category?: string;
  size?: string;
  quantityTotal?: number;
  quantityAvailable?: number;
  condition?: string;
  locationBin?: string;
  photoUrl?: string;
  notes?: string;
  isActive?: boolean;
}) {
  const store = await readStore();
  const name = input.name.trim();
  if (!name) throw new Error("equipment_name_required");

  const quantityTotal = Math.max(0, Math.floor(input.quantityTotal ?? 0));
  const quantityAvailable = Math.max(0, Math.min(quantityTotal, Math.floor(input.quantityAvailable ?? quantityTotal)));

  if (input.itemId) {
    const existing = store.items.find((entry) => entry.id === input.itemId);
    if (!existing) throw new Error("equipment_item_not_found");
    existing.name = name;
    existing.category = input.category?.trim() || "General";
    existing.size = input.size?.trim() || undefined;
    existing.quantityTotal = quantityTotal;
    existing.quantityAvailable = quantityAvailable;
    existing.condition = normalizeCondition(input.condition);
    existing.locationBin = input.locationBin?.trim() || undefined;
    existing.photoUrl = input.photoUrl?.trim() || undefined;
    existing.notes = input.notes?.trim() || undefined;
    existing.isActive = input.isActive ?? true;
    existing.updatedAt = nowIso();
    await writeStore(store);
    return existing;
  }

  const next: EquipmentItem = {
    id: crypto.randomUUID(),
    name,
    category: input.category?.trim() || "General",
    size: input.size?.trim() || undefined,
    quantityTotal,
    quantityAvailable,
    condition: normalizeCondition(input.condition),
    locationBin: input.locationBin?.trim() || undefined,
    photoUrl: input.photoUrl?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    isActive: input.isActive ?? true,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  store.items.push(next);
  await writeStore(store);
  return next;
}

export async function deleteEquipmentItem(itemId: string) {
  const store = await readStore();
  const before = store.items.length;
  store.items = store.items.filter((entry) => entry.id !== itemId);
  await writeStore(store);
  return store.items.length < before;
}

export async function createEquipmentRequest(input: {
  userId: string;
  itemId?: string;
  itemName: string;
  sizeNeeded?: string;
  urgency?: string;
  notes?: string;
}) {
  const store = await readStore();
  const itemName = input.itemName.trim();
  if (!itemName) throw new Error("equipment_request_item_required");

  const urgency = input.urgency === "low" || input.urgency === "high" ? input.urgency : "normal";
  const next: EquipmentRequest = {
    id: crypto.randomUUID(),
    userId: input.userId,
    itemId: input.itemId?.trim() || undefined,
    itemName,
    sizeNeeded: input.sizeNeeded?.trim() || undefined,
    urgency,
    notes: input.notes?.trim() || undefined,
    status: "submitted",
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  store.requests.push(next);
  await writeStore(store);
  return next;
}

function normalizeRequestStatus(input?: string): EquipmentRequestStatus {
  const value = (input || "").trim();
  if (
    value === "submitted" ||
    value === "approved" ||
    value === "ready" ||
    value === "picked_up" ||
    value === "returned" ||
    value === "denied"
  ) {
    return value;
  }
  return "submitted";
}

export async function reviewEquipmentRequest(input: {
  requestId: string;
  status: string;
  reviewNotes?: string;
  reviewedByUserId: string;
  assignedItemLabel?: string;
}) {
  const store = await readStore();
  const request = store.requests.find((entry) => entry.id === input.requestId);
  if (!request) throw new Error("equipment_request_not_found");

  request.status = normalizeRequestStatus(input.status);
  request.reviewNotes = input.reviewNotes?.trim() || undefined;
  request.assignedItemLabel = input.assignedItemLabel?.trim() || undefined;
  request.reviewedByUserId = input.reviewedByUserId;
  request.updatedAt = nowIso();

  await writeStore(store);
  return request;
}
