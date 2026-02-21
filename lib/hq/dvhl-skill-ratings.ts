import { promises as fs } from "node:fs";
import path from "node:path";
import { readStore } from "@/lib/hq/store";

export type DvhlSkillLevel = {
  level: number;
  min: number;
  max: number;
  summary: string;
};

export type DvhlSkillRating = {
  userId: string;
  position: "O" | "D" | "G";
  rating: number;
  level: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

type DvhlSkillRatingStore = {
  ratings: DvhlSkillRating[];
};

const defaultStore: DvhlSkillRatingStore = {
  ratings: []
};

function nowIso() {
  return new Date().toISOString();
}

function resolvedStorePath() {
  if (process.env.DVHL_SKILL_RATING_STORE_PATH) {
    return process.env.DVHL_SKILL_RATING_STORE_PATH;
  }

  if (process.env.NODE_ENV === "production") {
    return "/tmp/dvhl-skill-ratings.json";
  }

  return path.join(process.cwd(), "data", "dvhl-skill-ratings.json");
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

async function readRatingStore(): Promise<DvhlSkillRatingStore> {
  await ensureStoreFile();
  const storePath = resolvedStorePath();

  try {
    const parsed = JSON.parse(await fs.readFile(storePath, "utf-8")) as DvhlSkillRatingStore;
    return {
      ratings: Array.isArray(parsed.ratings) ? parsed.ratings : []
    };
  } catch {
    return { ...defaultStore };
  }
}

async function writeRatingStore(store: DvhlSkillRatingStore) {
  const storePath = resolvedStorePath();
  await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf-8");
}

function normalizePosition(value?: string): "O" | "D" | "G" {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "D") return "D";
  if (normalized === "G") return "G";
  return "O";
}

function toLevel(rating: number) {
  const safe = Math.max(0, Math.min(100, Math.floor(rating)));
  if (safe <= 10) return 1;
  if (safe <= 20) return 2;
  if (safe <= 30) return 3;
  if (safe <= 40) return 4;
  if (safe <= 50) return 5;
  if (safe <= 60) return 6;
  if (safe <= 70) return 7;
  if (safe <= 80) return 8;
  if (safe <= 90) return 9;
  return 10;
}

export function listDvhlSkillLevels(): DvhlSkillLevel[] {
  return [
    {
      level: 1,
      min: 0,
      max: 10,
      summary:
        "Beginner. Needs foundational skating, puck skills, and rules development."
    },
    {
      level: 2,
      min: 11,
      max: 20,
      summary:
        "Basic understanding, but still struggles across skating, puck control, passing, and shooting."
    },
    {
      level: 3,
      min: 21,
      max: 30,
      summary:
        "More comfortable on skates, but still limited forward/backward skating and puck execution."
    },
    {
      level: 4,
      min: 31,
      max: 40,
      summary:
        "Developing positional play and team concepts, still inconsistent skating and puck skills."
    },
    {
      level: 5,
      min: 41,
      max: 50,
      summary:
        "Comfortable forward and backward skating; building consistency in handling, passing, and crossovers."
    },
    {
      level: 6,
      min: 51,
      max: 60,
      summary:
        "Average recreational level: competitive play, solid game understanding, generally athletic."
    },
    {
      level: 7,
      min: 61,
      max: 70,
      summary:
        "Comfortable in faster pace with stronger all-around execution and average physical shape."
    },
    {
      level: 8,
      min: 71,
      max: 80,
      summary:
        "Substantial hockey ability and experience; typically coached with meaningful game background."
    },
    {
      level: 9,
      min: 81,
      max: 90,
      summary:
        "High level across all areas with strong rules, concepts, and puck skills."
    },
    {
      level: 10,
      min: 91,
      max: 100,
      summary:
        "Top tier recreational skill profile with high-level execution and above-average conditioning."
    }
  ];
}

export async function getDvhlSkillRatingByUser(userId: string) {
  const store = await readRatingStore();
  return store.ratings.find((entry) => entry.userId === userId);
}

export async function upsertDvhlSkillRating(input: {
  userId: string;
  position?: string;
  rating: number;
  notes?: string;
}) {
  const safeRating = Math.max(0, Math.min(100, Math.floor(input.rating)));
  const store = await readRatingStore();
  const existing = store.ratings.find((entry) => entry.userId === input.userId);
  const next: DvhlSkillRating = {
    userId: input.userId,
    position: normalizePosition(input.position),
    rating: safeRating,
    level: toLevel(safeRating),
    notes: input.notes?.trim() || undefined,
    createdAt: existing?.createdAt || nowIso(),
    updatedAt: nowIso()
  };

  if (existing) {
    Object.assign(existing, next);
  } else {
    store.ratings.push(next);
  }

  await writeRatingStore(store);
  return next;
}

export async function listDvhlSkillRatingsWithUsers() {
  const [store, hq] = await Promise.all([readRatingStore(), readStore()]);
  const usersById = new Map(hq.users.map((entry) => [entry.id, entry]));

  return store.ratings
    .map((entry) => {
      const user = usersById.get(entry.userId);
      return {
        ...entry,
        fullName: user?.fullName || "Unknown player",
        email: user?.email || "",
        role: user?.role || "public"
      };
    })
    .sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
}
