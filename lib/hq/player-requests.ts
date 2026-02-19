import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export type RequestStatus = "pending" | "approved" | "rejected";

export type PhotoSubmissionRequest = {
  id: string;
  userId: string;
  imageUrl: string;
  caption?: string;
  status: RequestStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedByUserId?: string;
  reviewNotes?: string;
  approvedPhotoId?: string;
};

export type JerseyNumberRequest = {
  id: string;
  userId: string;
  rosterId: string;
  primarySubRoster?: string;
  requiresApproval?: boolean;
  approvalReason?: string;
  currentJerseyNumber?: number;
  requestedJerseyNumber: number;
  status: RequestStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedByUserId?: string;
  reviewNotes?: string;
};

type PlayerRequestStore = {
  photoSubmissions: PhotoSubmissionRequest[];
  jerseyNumberRequests: JerseyNumberRequest[];
};

const defaultStore: PlayerRequestStore = {
  photoSubmissions: [],
  jerseyNumberRequests: []
};

function nowIso() {
  return new Date().toISOString();
}

function requestStorePath() {
  return path.join(process.cwd(), "data", "player-requests.json");
}

async function ensureStoreFile() {
  const filePath = requestStorePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultStore, null, 2), "utf-8");
    return;
  }

  try {
    const parsed = JSON.parse(await fs.readFile(filePath, "utf-8")) as Partial<PlayerRequestStore>;
    const normalized: PlayerRequestStore = {
      photoSubmissions: Array.isArray(parsed.photoSubmissions) ? parsed.photoSubmissions : [],
      jerseyNumberRequests: Array.isArray(parsed.jerseyNumberRequests) ? parsed.jerseyNumberRequests : []
    };
    await fs.writeFile(filePath, JSON.stringify(normalized, null, 2), "utf-8");
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

async function readStore() {
  await ensureStoreFile();
  return JSON.parse(await fs.readFile(requestStorePath(), "utf-8")) as PlayerRequestStore;
}

async function writeStore(store: PlayerRequestStore) {
  await fs.writeFile(requestStorePath(), JSON.stringify(store, null, 2), "utf-8");
}

export async function listPhotoSubmissionRequestsByUser(userId: string) {
  const store = await readStore();
  return store.photoSubmissions
    .filter((entry) => entry.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function listJerseyNumberRequestsByUser(userId: string) {
  const store = await readStore();
  return store.jerseyNumberRequests
    .filter((entry) => entry.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createPhotoSubmissionRequest(input: {
  userId: string;
  imageUrl: string;
  caption?: string;
}) {
  const store = await readStore();
  const imageUrl = input.imageUrl.trim();
  if (!imageUrl) {
    throw new Error("image_url_required");
  }

  const openRequest = store.photoSubmissions.find(
    (entry) => entry.userId === input.userId && entry.status === "pending"
  );
  if (openRequest) {
    throw new Error("photo_request_already_pending");
  }

  const created: PhotoSubmissionRequest = {
    id: crypto.randomUUID(),
    userId: input.userId,
    imageUrl,
    caption: input.caption?.trim() || undefined,
    status: "pending",
    createdAt: nowIso()
  };

  store.photoSubmissions.push(created);
  await writeStore(store);
  return created;
}

export async function createJerseyNumberRequest(input: {
  userId: string;
  rosterId: string;
  primarySubRoster?: string;
  requiresApproval?: boolean;
  approvalReason?: string;
  requestedJerseyNumber: number;
  currentJerseyNumber?: number;
}) {
  const store = await readStore();

  if (!input.rosterId.trim()) {
    throw new Error("roster_required");
  }

  if (!Number.isInteger(input.requestedJerseyNumber) || input.requestedJerseyNumber < 1 || input.requestedJerseyNumber > 99) {
    throw new Error("invalid_jersey_number");
  }

  const openRequest = store.jerseyNumberRequests.find(
    (entry) => entry.userId === input.userId && entry.status === "pending"
  );
  if (openRequest) {
    throw new Error("jersey_request_already_pending");
  }

  const created: JerseyNumberRequest = {
    id: crypto.randomUUID(),
    userId: input.userId,
    rosterId: input.rosterId.trim(),
    primarySubRoster: input.primarySubRoster?.trim() || undefined,
    requiresApproval: input.requiresApproval ?? true,
    approvalReason: input.approvalReason?.trim() || undefined,
    currentJerseyNumber: input.currentJerseyNumber,
    requestedJerseyNumber: input.requestedJerseyNumber,
    status: "pending",
    createdAt: nowIso()
  };

  store.jerseyNumberRequests.push(created);
  await writeStore(store);
  return created;
}

export async function listPendingPhotoSubmissionRequests() {
  const store = await readStore();
  return store.photoSubmissions
    .filter((entry) => entry.status === "pending")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function listPendingJerseyNumberRequests() {
  const store = await readStore();
  return store.jerseyNumberRequests
    .filter((entry) => entry.status === "pending")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function reviewPhotoSubmissionRequest(input: {
  requestId: string;
  reviewedByUserId: string;
  decision: "approved" | "rejected";
  reviewNotes?: string;
  approvedPhotoId?: string;
}) {
  const store = await readStore();
  const request = store.photoSubmissions.find((entry) => entry.id === input.requestId);
  if (!request) {
    throw new Error("photo_request_not_found");
  }
  if (request.status !== "pending") {
    throw new Error("photo_request_not_pending");
  }

  request.status = input.decision;
  request.reviewedAt = nowIso();
  request.reviewedByUserId = input.reviewedByUserId;
  request.reviewNotes = input.reviewNotes?.trim() || undefined;
  request.approvedPhotoId = input.approvedPhotoId;
  await writeStore(store);
  return request;
}

export async function reviewJerseyNumberRequest(input: {
  requestId: string;
  reviewedByUserId: string;
  decision: "approved" | "rejected";
  reviewNotes?: string;
}) {
  const store = await readStore();
  const request = store.jerseyNumberRequests.find((entry) => entry.id === input.requestId);
  if (!request) {
    throw new Error("jersey_request_not_found");
  }
  if (request.status !== "pending") {
    throw new Error("jersey_request_not_pending");
  }

  request.status = input.decision;
  request.reviewedAt = nowIso();
  request.reviewedByUserId = input.reviewedByUserId;
  request.reviewNotes = input.reviewNotes?.trim() || undefined;
  await writeStore(store);
  return request;
}
