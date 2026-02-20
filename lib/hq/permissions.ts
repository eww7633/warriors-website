import { promises as fs } from "node:fs";
import path from "node:path";
import { MemberUser } from "@/lib/types";

export type OpsRoleKey =
  | "super_admin"
  | "president"
  | "vp_hockey_ops"
  | "general_manager"
  | "assistant_general_manager"
  | "equipment_manager"
  | "technology_manager"
  | "dvhl_manager"
  | "media_manager";

export type OpsPermission =
  | "admin_portal"
  | "manage_players"
  | "manage_events"
  | "manage_news"
  | "manage_dvhl"
  | "manage_media"
  | "manage_site_users"
  | "assign_ops_roles";

export type OpsRoleAssignment = {
  userId: string;
  roleKey: OpsRoleKey;
  titleLabel: string;
  officialEmail?: string;
  badgeLabel?: string;
  updatedAt: string;
  updatedByUserId?: string;
};

type OpsRolesStore = {
  assignments: OpsRoleAssignment[];
};

const defaultStore: OpsRolesStore = {
  assignments: []
};

const ROLE_DEFS: Record<OpsRoleKey, { label: string; permissions: OpsPermission[]; badge: string }> = {
  super_admin: {
    label: "Super Admin",
    permissions: [
      "admin_portal",
      "manage_players",
      "manage_events",
      "manage_news",
      "manage_dvhl",
      "manage_media",
      "manage_site_users",
      "assign_ops_roles"
    ],
    badge: "Super Admin"
  },
  president: {
    label: "President",
    permissions: [
      "admin_portal",
      "manage_players",
      "manage_events",
      "manage_news",
      "manage_dvhl",
      "manage_media",
      "manage_site_users"
    ],
    badge: "President"
  },
  vp_hockey_ops: {
    label: "VP Hockey Ops",
    permissions: ["admin_portal", "manage_players", "manage_events", "manage_site_users"],
    badge: "VP Hockey Ops"
  },
  general_manager: {
    label: "General Manager",
    permissions: ["admin_portal", "manage_players", "manage_events"],
    badge: "GM"
  },
  assistant_general_manager: {
    label: "Assistant General Manager",
    permissions: ["admin_portal", "manage_players", "manage_events"],
    badge: "Assistant GM"
  },
  equipment_manager: {
    label: "Equipment Manager",
    permissions: ["admin_portal", "manage_players"],
    badge: "Equipment"
  },
  technology_manager: {
    label: "Technology Manager",
    permissions: ["admin_portal", "manage_site_users", "manage_events"],
    badge: "Technology"
  },
  dvhl_manager: {
    label: "DVHL Manager",
    permissions: ["admin_portal", "manage_dvhl", "manage_events"],
    badge: "DVHL"
  },
  media_manager: {
    label: "Media Manager",
    permissions: ["admin_portal", "manage_news", "manage_media"],
    badge: "Media"
  }
};

function storePath() {
  return path.join(process.cwd(), "data", "ops-roles.json");
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function superAdminEmailSet() {
  const env = process.env.SUPER_ADMIN_EMAILS || process.env.ADMIN_EMAIL || "ops@pghwarriorhockey.org";
  return new Set(
    env
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  );
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
    const parsed = JSON.parse(await fs.readFile(filePath, "utf-8")) as Partial<OpsRolesStore>;
    const normalized: OpsRolesStore = {
      assignments: Array.isArray(parsed.assignments) ? parsed.assignments : []
    };
    await fs.writeFile(filePath, JSON.stringify(normalized, null, 2), "utf-8");
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

async function readStore() {
  await ensureStoreFile();
  return JSON.parse(await fs.readFile(storePath(), "utf-8")) as OpsRolesStore;
}

async function writeStore(store: OpsRolesStore) {
  await fs.writeFile(storePath(), JSON.stringify(store, null, 2), "utf-8");
}

export function listOpsRoleDefinitions() {
  return Object.entries(ROLE_DEFS).map(([key, def]) => ({
    key: key as OpsRoleKey,
    label: def.label,
    badge: def.badge,
    permissions: [...def.permissions]
  }));
}

export async function listOpsRoleAssignments() {
  const store = await readStore();
  return [...store.assignments];
}

export async function getUserOpsAssignments(userId: string) {
  const store = await readStore();
  return store.assignments.filter((entry) => entry.userId === userId);
}

export async function upsertUserOpsRole(input: {
  actorUserId: string;
  targetUserId: string;
  roleKey: OpsRoleKey;
  titleLabel?: string;
  officialEmail?: string;
  badgeLabel?: string;
}) {
  const store = await readStore();
  const roleDef = ROLE_DEFS[input.roleKey];

  const next: OpsRoleAssignment = {
    userId: input.targetUserId,
    roleKey: input.roleKey,
    titleLabel: normalizeText(input.titleLabel) || roleDef.label,
    officialEmail: normalizeText(input.officialEmail),
    badgeLabel: normalizeText(input.badgeLabel) || roleDef.badge,
    updatedAt: nowIso(),
    updatedByUserId: input.actorUserId
  };

  const idx = store.assignments.findIndex((entry) => entry.userId === input.targetUserId && entry.roleKey === input.roleKey);
  if (idx >= 0) {
    store.assignments[idx] = next;
  } else {
    store.assignments.push(next);
  }

  await writeStore(store);
  return next;
}

export async function clearUserOpsRoles(input: { actorUserId: string; targetUserId: string }) {
  const store = await readStore();
  const before = store.assignments.length;
  store.assignments = store.assignments.filter((entry) => entry.userId !== input.targetUserId);
  await writeStore(store);
  return { removed: before - store.assignments.length };
}

export async function getUserPermissions(user: Pick<MemberUser, "id" | "email" | "role">) {
  const perms = new Set<OpsPermission>();
  if (user.role === "admin") {
    perms.add("admin_portal");
    perms.add("manage_players");
    perms.add("manage_events");
    perms.add("manage_site_users");
  }

  const emails = superAdminEmailSet();
  if (emails.has((user.email || "").toLowerCase())) {
    for (const permission of ROLE_DEFS.super_admin.permissions) {
      perms.add(permission);
    }
    return perms;
  }

  const assignments = await getUserOpsAssignments(user.id);
  for (const assignment of assignments) {
    const def = ROLE_DEFS[assignment.roleKey];
    for (const permission of def.permissions) {
      perms.add(permission);
    }
  }
  return perms;
}

export async function isSuperAdmin(user: Pick<MemberUser, "id" | "email" | "role"> | null | undefined) {
  if (!user) return false;
  const perms = await getUserPermissions(user);
  return perms.has("assign_ops_roles");
}

export async function canAccessAdminPanel(user: Pick<MemberUser, "id" | "email" | "role"> | null | undefined) {
  if (!user) return false;
  const perms = await getUserPermissions(user);
  return perms.has("admin_portal");
}

export async function userHasPermission(
  user: Pick<MemberUser, "id" | "email" | "role"> | null | undefined,
  permission: OpsPermission
) {
  if (!user) return false;
  const perms = await getUserPermissions(user);
  return perms.has(permission);
}

export async function getUserOpsBadges(userId: string) {
  const assignments = await getUserOpsAssignments(userId);
  return assignments.map((assignment) => assignment.badgeLabel || ROLE_DEFS[assignment.roleKey].badge);
}
