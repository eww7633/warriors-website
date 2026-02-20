import { promises as fs } from "node:fs";
import path from "node:path";

export type DvhlTeamControl = {
  teamId: string;
  captainUserId?: string;
  subPoolUserIds: string[];
  updatedAt: string;
  updatedByUserId: string;
};

type DvhlStore = {
  controls: DvhlTeamControl[];
};

const defaultStore: DvhlStore = {
  controls: []
};

function nowIso() {
  return new Date().toISOString();
}

function resolvedStorePath() {
  if (process.env.DVHL_CONTROL_STORE_PATH) {
    return process.env.DVHL_CONTROL_STORE_PATH;
  }

  if (process.env.NODE_ENV === "production") {
    return "/tmp/dvhl-controls.json";
  }

  return path.join(process.cwd(), "data", "dvhl-controls.json");
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

async function readStore(): Promise<DvhlStore> {
  await ensureStoreFile();
  const storePath = resolvedStorePath();

  try {
    const parsed = JSON.parse(await fs.readFile(storePath, "utf-8")) as DvhlStore;
    return {
      controls: Array.isArray(parsed.controls) ? parsed.controls : []
    };
  } catch {
    return { ...defaultStore };
  }
}

async function writeStore(store: DvhlStore) {
  const storePath = resolvedStorePath();
  await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf-8");
}

export async function getDvhlTeamControlMap(teamIds: string[]) {
  const idSet = new Set(teamIds);
  const store = await readStore();
  const map: Record<string, DvhlTeamControl> = {};

  for (const teamId of teamIds) {
    map[teamId] = {
      teamId,
      subPoolUserIds: [],
      updatedAt: "",
      updatedByUserId: ""
    };
  }

  for (const entry of store.controls) {
    if (!idSet.has(entry.teamId)) continue;
    map[entry.teamId] = entry;
  }

  return map;
}

export async function setDvhlTeamCaptain(input: {
  teamId: string;
  captainUserId?: string;
  updatedByUserId: string;
}) {
  const store = await readStore();
  const idx = store.controls.findIndex((entry) => entry.teamId === input.teamId);
  const existing = idx >= 0 ? store.controls[idx] : undefined;

  const next: DvhlTeamControl = {
    teamId: input.teamId,
    captainUserId: input.captainUserId || undefined,
    subPoolUserIds: existing?.subPoolUserIds || [],
    updatedAt: nowIso(),
    updatedByUserId: input.updatedByUserId
  };

  if (idx >= 0) {
    store.controls[idx] = next;
  } else {
    store.controls.push(next);
  }

  await writeStore(store);
  return next;
}

export async function addDvhlSubPoolMember(input: {
  teamId: string;
  userId: string;
  updatedByUserId: string;
}) {
  const store = await readStore();
  const idx = store.controls.findIndex((entry) => entry.teamId === input.teamId);
  const existing = idx >= 0 ? store.controls[idx] : undefined;
  const set = new Set(existing?.subPoolUserIds || []);
  set.add(input.userId);

  const next: DvhlTeamControl = {
    teamId: input.teamId,
    captainUserId: existing?.captainUserId,
    subPoolUserIds: Array.from(set),
    updatedAt: nowIso(),
    updatedByUserId: input.updatedByUserId
  };

  if (idx >= 0) {
    store.controls[idx] = next;
  } else {
    store.controls.push(next);
  }

  await writeStore(store);
  return next;
}

export async function removeDvhlSubPoolMember(input: {
  teamId: string;
  userId: string;
  updatedByUserId: string;
}) {
  const store = await readStore();
  const idx = store.controls.findIndex((entry) => entry.teamId === input.teamId);
  if (idx < 0) {
    return null;
  }

  const existing = store.controls[idx];
  const next: DvhlTeamControl = {
    ...existing,
    subPoolUserIds: existing.subPoolUserIds.filter((entry) => entry !== input.userId),
    updatedAt: nowIso(),
    updatedByUserId: input.updatedByUserId
  };

  store.controls[idx] = next;
  await writeStore(store);
  return next;
}
