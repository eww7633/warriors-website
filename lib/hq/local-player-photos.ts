import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export type LocalPlayerPhoto = {
  id: string;
  userId: string;
  imageUrl: string;
  caption?: string;
  isPrimary: boolean;
  createdAt: string;
};

type LocalPlayerPhotoStore = {
  photos: LocalPlayerPhoto[];
};

const defaultStore: LocalPlayerPhotoStore = { photos: [] };

function nowIso() {
  return new Date().toISOString();
}

function storePath() {
  if (process.env.PLAYER_PHOTO_STORE_PATH) {
    return process.env.PLAYER_PHOTO_STORE_PATH;
  }
  if (process.env.NODE_ENV === "production") {
    return "/tmp/player-photos.json";
  }
  return path.join(process.cwd(), "data", "player-photos.json");
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
    const parsed = JSON.parse(await fs.readFile(filePath, "utf-8")) as Partial<LocalPlayerPhotoStore>;
    const normalized: LocalPlayerPhotoStore = {
      photos: Array.isArray(parsed.photos) ? parsed.photos : []
    };
    await fs.writeFile(filePath, JSON.stringify(normalized, null, 2), "utf-8");
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

async function readStore() {
  await ensureStoreFile();
  return JSON.parse(await fs.readFile(storePath(), "utf-8")) as LocalPlayerPhotoStore;
}

async function writeStore(store: LocalPlayerPhotoStore) {
  await fs.writeFile(storePath(), JSON.stringify(store, null, 2), "utf-8");
}

export async function listLocalPlayerPhotosByUser(userId: string) {
  const store = await readStore();
  return store.photos
    .filter((entry) => entry.userId === userId)
    .sort((a, b) => {
      const primaryDelta = Number(b.isPrimary) - Number(a.isPrimary);
      if (primaryDelta !== 0) return primaryDelta;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export async function listLocalPlayerPhotosMapByUserIds(userIds: string[]) {
  const ids = new Set(userIds);
  const store = await readStore();
  const byUser = new Map<string, LocalPlayerPhoto[]>();
  for (const photo of store.photos) {
    if (!ids.has(photo.userId)) continue;
    const list = byUser.get(photo.userId) || [];
    list.push(photo);
    byUser.set(photo.userId, list);
  }
  for (const [key, value] of byUser.entries()) {
    byUser.set(
      key,
      value.sort((a, b) => {
        const primaryDelta = Number(b.isPrimary) - Number(a.isPrimary);
        if (primaryDelta !== 0) return primaryDelta;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
    );
  }
  return byUser;
}

export async function addLocalPlayerPhoto(input: {
  userId: string;
  imageUrl: string;
  caption?: string;
  makePrimary?: boolean;
}) {
  const store = await readStore();

  if (input.makePrimary) {
    for (const existing of store.photos) {
      if (existing.userId === input.userId && existing.isPrimary) {
        existing.isPrimary = false;
      }
    }
  }

  const hasAny = store.photos.some((entry) => entry.userId === input.userId);

  const next: LocalPlayerPhoto = {
    id: crypto.randomUUID(),
    userId: input.userId,
    imageUrl: input.imageUrl,
    caption: input.caption?.trim() || undefined,
    isPrimary: input.makePrimary || !hasAny,
    createdAt: nowIso()
  };

  store.photos.push(next);
  await writeStore(store);
  return next;
}
