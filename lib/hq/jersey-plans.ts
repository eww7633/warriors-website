import { promises as fs } from "node:fs";
import path from "node:path";

export type JerseyInstruction =
  | "home_dark"
  | "home_light"
  | "away_dark"
  | "away_light"
  | "both_sets"
  | "custom";

export type GameJerseyDirective = {
  gameId: string;
  competitionId: string;
  teamId: string;
  instruction: JerseyInstruction;
  note?: string;
  updatedAt: string;
  updatedByUserId: string;
};

export type PlayerJerseyAvailability = {
  gameId: string;
  teamId: string;
  userId: string;
  hasJersey: boolean;
  note?: string;
  updatedAt: string;
};

type JerseyPlanStore = {
  directives: GameJerseyDirective[];
  availability: PlayerJerseyAvailability[];
};

const defaultStore: JerseyPlanStore = {
  directives: [],
  availability: []
};

function nowIso() {
  return new Date().toISOString();
}

function resolvedStorePath() {
  if (process.env.JERSEY_PLAN_STORE_PATH) return process.env.JERSEY_PLAN_STORE_PATH;
  if (process.env.NODE_ENV === "production") return "/tmp/game-jersey-plans.json";
  return path.join(process.cwd(), "data", "game-jersey-plans.json");
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

async function readStore(): Promise<JerseyPlanStore> {
  await ensureStoreFile();
  try {
    const parsed = JSON.parse(await fs.readFile(resolvedStorePath(), "utf-8")) as JerseyPlanStore;
    return {
      directives: Array.isArray(parsed.directives) ? parsed.directives : [],
      availability: Array.isArray(parsed.availability) ? parsed.availability : []
    };
  } catch {
    return { ...defaultStore };
  }
}

async function writeStore(store: JerseyPlanStore) {
  await fs.writeFile(resolvedStorePath(), JSON.stringify(store, null, 2), "utf-8");
}

export async function setGameJerseyDirective(input: {
  gameId: string;
  competitionId: string;
  teamId: string;
  instruction: JerseyInstruction;
  note?: string;
  updatedByUserId: string;
}) {
  const store = await readStore();
  const idx = store.directives.findIndex((entry) => entry.gameId === input.gameId);
  const next: GameJerseyDirective = {
    gameId: input.gameId,
    competitionId: input.competitionId,
    teamId: input.teamId,
    instruction: input.instruction,
    note: input.note?.trim() || undefined,
    updatedAt: nowIso(),
    updatedByUserId: input.updatedByUserId
  };
  if (idx >= 0) store.directives[idx] = next;
  else store.directives.push(next);
  await writeStore(store);
  return next;
}

export async function setPlayerJerseyAvailability(input: {
  gameId: string;
  teamId: string;
  userId: string;
  hasJersey: boolean;
  note?: string;
}) {
  const store = await readStore();
  const idx = store.availability.findIndex(
    (entry) => entry.gameId === input.gameId && entry.userId === input.userId
  );
  const next: PlayerJerseyAvailability = {
    gameId: input.gameId,
    teamId: input.teamId,
    userId: input.userId,
    hasJersey: input.hasJersey,
    note: input.note?.trim() || undefined,
    updatedAt: nowIso()
  };
  if (idx >= 0) store.availability[idx] = next;
  else store.availability.push(next);
  await writeStore(store);
  return next;
}

export async function getJerseyPlanState(gameIds: string[]) {
  const ids = new Set(gameIds);
  const store = await readStore();
  return {
    directivesByGameId: Object.fromEntries(
      store.directives.filter((entry) => ids.has(entry.gameId)).map((entry) => [entry.gameId, entry])
    ) as Record<string, GameJerseyDirective>,
    availabilityByGameId: store.availability
      .filter((entry) => ids.has(entry.gameId))
      .reduce<Record<string, PlayerJerseyAvailability[]>>((acc, entry) => {
        acc[entry.gameId] = acc[entry.gameId] || [];
        acc[entry.gameId].push(entry);
        return acc;
      }, {})
  };
}

