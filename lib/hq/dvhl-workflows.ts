import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { hasDatabaseUrl } from "@/lib/db-env";
import { listCompetitions } from "@/lib/hq/competitions";
import { readDbJsonStore, writeDbJsonStore } from "@/lib/hq/db-json-store";
import { getDvhlTeamControlMap } from "@/lib/hq/dvhl";

export type DvhlDraftPick = {
  pickNumber: number;
  round: number;
  teamId: string;
  userId: string;
  pickedAt: string;
  pickedByUserId: string;
};

export type DvhlDraftSession = {
  id: string;
  competitionId: string;
  status: "open" | "closed";
  pickOrderTeamIds: string[];
  currentPickIndex: number;
  draftMode: DvhlDraftMode;
  rounds: number;
  poolUserIds: string[];
  picks: DvhlDraftPick[];
  createdAt: string;
  updatedAt: string;
  updatedByUserId: string;
};

export type DvhlSubRequest = {
  id: string;
  competitionId: string;
  teamId: string;
  captainUserId: string;
  requestedByUserId: string;
  message?: string;
  neededForGameId?: string;
  status: "open" | "accepted" | "cancelled";
  acceptedByUserId?: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type DvhlDraftMode = "manual" | "snake";

export type DvhlSeasonPlan = {
  competitionId: string;
  signupClosesAt?: string;
  captainSignupClosesAt?: string;
  desiredCaptainCount: number;
  teamOrderStrategy: "manual" | "random";
  playerPoolStrategy: "ops_selected" | "all_signups" | "all_eligible";
  draftMode: DvhlDraftMode;
  rounds: number;
  createdAt: string;
  updatedAt: string;
  updatedByUserId: string;
};

export type DvhlSignupIntent = {
  id: string;
  competitionId: string;
  userId: string;
  wantsCaptain: boolean;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

type DvhlWorkflowStore = {
  drafts: DvhlDraftSession[];
  subRequests: DvhlSubRequest[];
  plans: DvhlSeasonPlan[];
  signups: DvhlSignupIntent[];
};

const defaultStore: DvhlWorkflowStore = {
  drafts: [],
  subRequests: [],
  plans: [],
  signups: []
};

function nowIso() {
  return new Date().toISOString();
}

function resolvedStorePath() {
  if (process.env.DVHL_WORKFLOW_STORE_PATH) {
    return process.env.DVHL_WORKFLOW_STORE_PATH;
  }
  if (process.env.NODE_ENV === "production") {
    return "/tmp/dvhl-workflows.json";
  }
  return path.join(process.cwd(), "data", "dvhl-workflows.json");
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

async function readStore(): Promise<DvhlWorkflowStore> {
  if (hasDatabaseUrl()) {
    const parsed = await readDbJsonStore<DvhlWorkflowStore>("dvhlWorkflows", defaultStore);
    return {
      drafts: Array.isArray(parsed.drafts) ? parsed.drafts : [],
      subRequests: Array.isArray(parsed.subRequests) ? parsed.subRequests : [],
      plans: Array.isArray(parsed.plans) ? parsed.plans : [],
      signups: Array.isArray(parsed.signups) ? parsed.signups : []
    };
  }

  await ensureStoreFile();
  const storePath = resolvedStorePath();
  try {
    const parsed = JSON.parse(await fs.readFile(storePath, "utf-8")) as DvhlWorkflowStore;
    return {
      drafts: Array.isArray(parsed.drafts) ? parsed.drafts : [],
      subRequests: Array.isArray(parsed.subRequests) ? parsed.subRequests : [],
      plans: Array.isArray(parsed.plans) ? parsed.plans : [],
      signups: Array.isArray(parsed.signups) ? parsed.signups : []
    };
  } catch {
    return { ...defaultStore };
  }
}

async function writeStore(store: DvhlWorkflowStore) {
  if (hasDatabaseUrl()) {
    await writeDbJsonStore("dvhlWorkflows", store);
    return;
  }

  const storePath = resolvedStorePath();
  await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf-8");
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((entry) => entry.trim()).filter(Boolean)));
}

function normalizeDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

export function getDvhlPlanPhase(input?: DvhlSeasonPlan) {
  if (!input) return "plan_setup" as const;
  const now = Date.now();
  const signupClose = input.signupClosesAt ? new Date(input.signupClosesAt).getTime() : null;
  if (signupClose && now < signupClose) {
    return "signup_open" as const;
  }
  return "captain_assignment" as const;
}

export async function getDvhlSeasonPlan(competitionId: string) {
  const store = await readStore();
  return store.plans.find((entry) => entry.competitionId === competitionId);
}

export async function upsertDvhlSeasonPlan(input: {
  competitionId: string;
  signupClosesAt?: string;
  captainSignupClosesAt?: string;
  desiredCaptainCount?: number;
  teamOrderStrategy?: "manual" | "random";
  playerPoolStrategy?: "ops_selected" | "all_signups" | "all_eligible";
  draftMode?: DvhlDraftMode;
  rounds?: number;
  updatedByUserId: string;
}) {
  const store = await readStore();
  const existing = store.plans.find((entry) => entry.competitionId === input.competitionId);

  const next: DvhlSeasonPlan = {
    competitionId: input.competitionId,
    signupClosesAt: normalizeDate(input.signupClosesAt) ?? existing?.signupClosesAt,
    captainSignupClosesAt:
      normalizeDate(input.captainSignupClosesAt) ?? existing?.captainSignupClosesAt,
    desiredCaptainCount: input.desiredCaptainCount || existing?.desiredCaptainCount || 4,
    teamOrderStrategy: input.teamOrderStrategy || existing?.teamOrderStrategy || "manual",
    playerPoolStrategy: input.playerPoolStrategy || existing?.playerPoolStrategy || "all_signups",
    draftMode: input.draftMode || existing?.draftMode || "manual",
    rounds: input.rounds || existing?.rounds || 1,
    createdAt: existing?.createdAt || nowIso(),
    updatedAt: nowIso(),
    updatedByUserId: input.updatedByUserId
  };

  if (existing) {
    Object.assign(existing, next);
  } else {
    store.plans.push(next);
  }

  await writeStore(store);
  return next;
}

export async function listDvhlSignupIntents(competitionId?: string) {
  const store = await readStore();
  return store.signups
    .filter((entry) => !competitionId || entry.competitionId === competitionId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function upsertDvhlSignupIntent(input: {
  competitionId: string;
  userId: string;
  wantsCaptain: boolean;
  note?: string;
}) {
  const store = await readStore();
  const existing = store.signups.find(
    (entry) => entry.competitionId === input.competitionId && entry.userId === input.userId
  );

  const next: DvhlSignupIntent = {
    id: existing?.id || crypto.randomUUID(),
    competitionId: input.competitionId,
    userId: input.userId,
    wantsCaptain: input.wantsCaptain,
    note: input.note?.trim() || undefined,
    createdAt: existing?.createdAt || nowIso(),
    updatedAt: nowIso()
  };

  if (existing) {
    Object.assign(existing, next);
  } else {
    store.signups.push(next);
  }

  await writeStore(store);
  return next;
}

export async function getDvhlDraftSession(competitionId: string) {
  const store = await readStore();
  return store.drafts.find((entry) => entry.competitionId === competitionId);
}

export async function upsertDvhlDraftSession(input: {
  competitionId: string;
  pickOrderTeamIds: string[];
  poolUserIds: string[];
  draftMode?: DvhlDraftMode;
  rounds?: number;
  updatedByUserId: string;
}) {
  const store = await readStore();
  const existing = store.drafts.find((entry) => entry.competitionId === input.competitionId);

  const next: DvhlDraftSession = {
    id: existing?.id || crypto.randomUUID(),
    competitionId: input.competitionId,
    status: "open",
    pickOrderTeamIds: unique(input.pickOrderTeamIds),
    currentPickIndex: 0,
    draftMode: input.draftMode || existing?.draftMode || "manual",
    rounds: input.rounds || existing?.rounds || 1,
    poolUserIds: unique(input.poolUserIds),
    picks: [],
    createdAt: existing?.createdAt || nowIso(),
    updatedAt: nowIso(),
    updatedByUserId: input.updatedByUserId
  };

  if (existing) {
    Object.assign(existing, next);
  } else {
    store.drafts.push(next);
  }
  await writeStore(store);
  return next;
}

export async function closeDvhlDraftSession(input: {
  competitionId: string;
  updatedByUserId: string;
}) {
  const store = await readStore();
  const draft = store.drafts.find((entry) => entry.competitionId === input.competitionId);
  if (!draft) {
    throw new Error("draft_not_found");
  }
  draft.status = "closed";
  draft.updatedAt = nowIso();
  draft.updatedByUserId = input.updatedByUserId;
  await writeStore(store);
  return draft;
}

export async function makeDvhlDraftPick(input: {
  competitionId: string;
  teamId: string;
  userId: string;
  actorUserId: string;
}) {
  const store = await readStore();
  const draft = store.drafts.find((entry) => entry.competitionId === input.competitionId);
  if (!draft || draft.status !== "open") {
    throw new Error("draft_not_open");
  }
  if (!draft.pickOrderTeamIds.includes(input.teamId)) {
    throw new Error("invalid_pick_team");
  }
  if (!draft.poolUserIds.includes(input.userId)) {
    throw new Error("player_not_in_draft_pool");
  }

  const alreadyPicked = draft.picks.some((entry) => entry.userId === input.userId);
  if (alreadyPicked) {
    throw new Error("player_already_picked");
  }

  const expectedTeamId = (() => {
    const teamCount = draft.pickOrderTeamIds.length;
    const pickIndex = draft.currentPickIndex;
    const roundIndex = Math.floor(pickIndex / teamCount);
    const inRoundIndex = pickIndex % teamCount;

    if (draft.draftMode === "snake" && roundIndex % 2 === 1) {
      return draft.pickOrderTeamIds[teamCount - 1 - inRoundIndex];
    }
    return draft.pickOrderTeamIds[inRoundIndex];
  })();
  if (expectedTeamId !== input.teamId) {
    throw new Error("not_this_team_turn");
  }

  const pickNumber = draft.picks.length + 1;
  const round = Math.floor((pickNumber - 1) / draft.pickOrderTeamIds.length) + 1;

  draft.picks.push({
    pickNumber,
    round,
    teamId: input.teamId,
    userId: input.userId,
    pickedAt: nowIso(),
    pickedByUserId: input.actorUserId
  });
  draft.currentPickIndex += 1;
  draft.updatedAt = nowIso();
  draft.updatedByUserId = input.actorUserId;

  await writeStore(store);
  return draft;
}

export async function listDvhlSubRequests(competitionId?: string) {
  const store = await readStore();
  return store.subRequests
    .filter((entry) => !competitionId || entry.competitionId === competitionId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createDvhlSubRequest(input: {
  competitionId: string;
  teamId: string;
  captainUserId: string;
  requestedByUserId: string;
  message?: string;
  neededForGameId?: string;
}) {
  const store = await readStore();
  const next: DvhlSubRequest = {
    id: crypto.randomUUID(),
    competitionId: input.competitionId,
    teamId: input.teamId,
    captainUserId: input.captainUserId,
    requestedByUserId: input.requestedByUserId,
    message: input.message?.trim() || undefined,
    neededForGameId: input.neededForGameId?.trim() || undefined,
    status: "open",
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  store.subRequests.push(next);
  await writeStore(store);
  return next;
}

export async function acceptDvhlSubRequest(input: {
  requestId: string;
  actorUserId: string;
}) {
  const store = await readStore();
  const request = store.subRequests.find((entry) => entry.id === input.requestId);
  if (!request || request.status !== "open") {
    throw new Error("sub_request_not_open");
  }
  request.status = "accepted";
  request.acceptedByUserId = input.actorUserId;
  request.acceptedAt = nowIso();
  request.updatedAt = nowIso();
  await writeStore(store);
  return request;
}

export async function cancelDvhlSubRequest(input: {
  requestId: string;
  actorUserId: string;
}) {
  const store = await readStore();
  const request = store.subRequests.find((entry) => entry.id === input.requestId);
  if (!request || request.status !== "open") {
    throw new Error("sub_request_not_open");
  }
  request.status = "cancelled";
  request.updatedAt = nowIso();
  await writeStore(store);
  return request;
}

export async function getDvhlWorkflowContext() {
  const competitions = await listCompetitions();
  const dvhlCompetitions = competitions.filter((entry) => entry.type === "DVHL");
  const teamIds = dvhlCompetitions.flatMap((entry) => entry.teams.map((team) => team.id));
  const teamControlMap = await getDvhlTeamControlMap(teamIds);
  return { dvhlCompetitions, teamControlMap };
}
