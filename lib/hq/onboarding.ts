import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type OnboardingChecklistTemplateItem = {
  id: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
  updatedByUserId?: string;
};

export type OnboardingChecklistCompletion = {
  userId: string;
  checklistItemId: string;
  completed: boolean;
  completedAt?: string;
  updatedAt: string;
  updatedByUserId: string;
  note?: string;
};

export type OnboardingChecklistAudit = {
  id: string;
  userId: string;
  checklistItemId: string;
  action: "checked" | "unchecked" | "template_updated";
  note?: string;
  updatedAt: string;
  updatedByUserId: string;
};

type OnboardingStore = {
  template: OnboardingChecklistTemplateItem[];
  completions: OnboardingChecklistCompletion[];
  audit: OnboardingChecklistAudit[];
};

const defaultTemplateLabels = [
  "Registration reviewed by Hockey Ops",
  "Invite accepted and account linked",
  "Equipment need reviewed",
  "USA Hockey number entered",
  "Primary sub-roster assigned (Gold/White/Black)",
  "Jersey number assigned",
  "Orientation complete"
];

function nowIso() {
  return new Date().toISOString();
}

function normalizeLabel(label: string) {
  return label.trim().replace(/\s+/g, " ");
}

function resolvedStorePath() {
  if (process.env.HQ_ONBOARDING_STORE_PATH) {
    return process.env.HQ_ONBOARDING_STORE_PATH;
  }

  if (process.env.NODE_ENV === "production") {
    return "/tmp/hq-onboarding.json";
  }

  return path.join(process.cwd(), "data", "hq-onboarding.json");
}

function buildDefaultStore(): OnboardingStore {
  const now = nowIso();
  return {
    template: defaultTemplateLabels.map((label, index) => ({
      id: `item_${index + 1}`,
      label,
      sortOrder: index,
      isActive: true,
      updatedAt: now
    })),
    completions: [],
    audit: []
  };
}

async function ensureStoreFile() {
  const storePath = resolvedStorePath();
  await fs.mkdir(path.dirname(storePath), { recursive: true });

  try {
    await fs.access(storePath);
  } catch {
    await fs.writeFile(storePath, JSON.stringify(buildDefaultStore(), null, 2), "utf-8");
  }
}

async function readStore(): Promise<OnboardingStore> {
  await ensureStoreFile();
  const storePath = resolvedStorePath();

  try {
    const parsed = JSON.parse(await fs.readFile(storePath, "utf-8")) as OnboardingStore;
    const template = Array.isArray(parsed.template) ? parsed.template : [];
    const completions = Array.isArray(parsed.completions) ? parsed.completions : [];
    const audit = Array.isArray(parsed.audit) ? parsed.audit : [];

    if (template.length === 0) {
      return buildDefaultStore();
    }

    return { template, completions, audit };
  } catch {
    return buildDefaultStore();
  }
}

async function writeStore(store: OnboardingStore) {
  const storePath = resolvedStorePath();
  await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf-8");
}

function sortTemplate(items: OnboardingChecklistTemplateItem[]) {
  return [...items]
    .filter((item) => item.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

export async function listOnboardingChecklistTemplate() {
  const store = await readStore();
  return sortTemplate(store.template);
}

export async function replaceOnboardingChecklistTemplate(input: {
  labels: string[];
  updatedByUserId: string;
}) {
  const normalized = input.labels.map(normalizeLabel).filter(Boolean);
  if (normalized.length === 0) {
    throw new Error("Checklist must include at least one item.");
  }

  const now = nowIso();
  const store = await readStore();
  const nextTemplate: OnboardingChecklistTemplateItem[] = normalized.map((label, index) => ({
    id: `item_${index + 1}`,
    label,
    sortOrder: index,
    isActive: true,
    updatedAt: now,
    updatedByUserId: input.updatedByUserId
  }));

  const nextIds = new Set(nextTemplate.map((item) => item.id));
  store.template = nextTemplate;
  store.completions = store.completions.filter((entry) => nextIds.has(entry.checklistItemId));
  store.audit.unshift({
    id: crypto.randomUUID(),
    userId: "template",
    checklistItemId: "template",
    action: "template_updated",
    updatedAt: now,
    updatedByUserId: input.updatedByUserId,
    note: `Template size: ${nextTemplate.length}`
  });
  store.audit = store.audit.slice(0, 1000);

  await writeStore(store);
  return sortTemplate(store.template);
}

export async function listOnboardingChecklistByUserIds(userIds: string[]) {
  const idSet = new Set(userIds);
  const store = await readStore();
  const template = sortTemplate(store.template);
  const completionMap: Record<string, Record<string, OnboardingChecklistCompletion>> = {};
  const auditMap: Record<string, OnboardingChecklistAudit[]> = {};

  for (const userId of userIds) {
    completionMap[userId] = {};
    auditMap[userId] = [];
  }

  for (const completion of store.completions) {
    if (!idSet.has(completion.userId)) continue;
    completionMap[completion.userId][completion.checklistItemId] = completion;
  }

  for (const audit of store.audit) {
    if (!idSet.has(audit.userId)) continue;
    auditMap[audit.userId].push(audit);
  }

  for (const userId of Object.keys(auditMap)) {
    auditMap[userId] = auditMap[userId]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 12);
  }

  return {
    template,
    completionMap,
    auditMap
  };
}

export async function setOnboardingChecklistItem(input: {
  userId: string;
  checklistItemId: string;
  completed: boolean;
  updatedByUserId: string;
  note?: string;
}) {
  const store = await readStore();
  const template = sortTemplate(store.template);
  const itemExists = template.some((entry) => entry.id === input.checklistItemId);

  if (!itemExists) {
    throw new Error("Checklist item not found.");
  }

  const now = nowIso();
  const next: OnboardingChecklistCompletion = {
    userId: input.userId,
    checklistItemId: input.checklistItemId,
    completed: input.completed,
    completedAt: input.completed ? now : undefined,
    updatedAt: now,
    updatedByUserId: input.updatedByUserId,
    note: input.note?.trim() || undefined
  };

  const idx = store.completions.findIndex(
    (entry) => entry.userId === input.userId && entry.checklistItemId === input.checklistItemId
  );

  if (idx >= 0) {
    store.completions[idx] = next;
  } else {
    store.completions.push(next);
  }

  store.audit.unshift({
    id: crypto.randomUUID(),
    userId: input.userId,
    checklistItemId: input.checklistItemId,
    action: input.completed ? "checked" : "unchecked",
    note: input.note?.trim() || undefined,
    updatedAt: now,
    updatedByUserId: input.updatedByUserId
  });
  store.audit = store.audit.slice(0, 5000);

  await writeStore(store);
  return next;
}
