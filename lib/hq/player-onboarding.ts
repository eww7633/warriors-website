import { promises as fs } from "node:fs";
import path from "node:path";

export type PlayerOnboardingState = {
  userId: string;
  profileCompletedAt?: string;
  equipmentCompletedAt?: string;
  acknowledgementsCompletedAt?: string;
  completedAt?: string;
  updatedAt: string;
};

type OnboardingStore = {
  states: PlayerOnboardingState[];
};

const defaultStore: OnboardingStore = {
  states: []
};

function nowIso() {
  return new Date().toISOString();
}

function storePath() {
  if (process.env.PLAYER_ONBOARDING_STORE_PATH) {
    return process.env.PLAYER_ONBOARDING_STORE_PATH;
  }
  if (process.env.NODE_ENV === "production") {
    return "/tmp/player-onboarding.json";
  }
  return path.join(process.cwd(), "data", "player-onboarding.json");
}

async function ensureStoreFile() {
  const filePath = storePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

async function readStore() {
  await ensureStoreFile();
  try {
    const parsed = JSON.parse(await fs.readFile(storePath(), "utf-8")) as Partial<OnboardingStore>;
    return {
      states: Array.isArray(parsed.states) ? parsed.states : []
    } satisfies OnboardingStore;
  } catch {
    return { ...defaultStore };
  }
}

async function writeStore(store: OnboardingStore) {
  await fs.writeFile(storePath(), JSON.stringify(store, null, 2), "utf-8");
}

export async function getPlayerOnboardingState(userId: string) {
  const store = await readStore();
  return store.states.find((entry) => entry.userId === userId) || null;
}

export function isPlayerOnboardingComplete(state: PlayerOnboardingState | null | undefined) {
  return Boolean(state?.profileCompletedAt && state?.equipmentCompletedAt && state?.acknowledgementsCompletedAt);
}

export async function upsertPlayerOnboardingState(input: {
  userId: string;
  profileCompleted?: boolean;
  equipmentCompleted?: boolean;
  acknowledgementsCompleted?: boolean;
}) {
  const store = await readStore();
  const now = nowIso();
  const idx = store.states.findIndex((entry) => entry.userId === input.userId);

  const current: PlayerOnboardingState =
    idx >= 0
      ? store.states[idx]
      : {
          userId: input.userId,
          updatedAt: now
        };

  if (input.profileCompleted) {
    current.profileCompletedAt = current.profileCompletedAt || now;
  }
  if (input.equipmentCompleted) {
    current.equipmentCompletedAt = current.equipmentCompletedAt || now;
  }
  if (input.acknowledgementsCompleted) {
    current.acknowledgementsCompletedAt = current.acknowledgementsCompletedAt || now;
  }

  if (isPlayerOnboardingComplete(current)) {
    current.completedAt = current.completedAt || now;
  }
  current.updatedAt = now;

  if (idx >= 0) {
    store.states[idx] = current;
  } else {
    store.states.push(current);
  }

  await writeStore(store);
  return current;
}
