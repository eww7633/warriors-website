import { getPrismaClient } from "@/lib/prisma";
import { hasDatabaseUrl } from "@/lib/db-env";
import { readStore, writeStore } from "@/lib/hq/store";
import { hashPassword } from "@/lib/hq/password";
import { getUserPermissions } from "@/lib/hq/permissions";
import { Role } from "@/lib/types";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function updateUserIdentity(input: {
  actorUserId: string;
  targetUserId: string;
  fullName: string;
  email: string;
  phone?: string;
  requestedPosition?: string;
  newPassword?: string;
}) {
  const email = normalizeEmail(input.email);
  const fullName = input.fullName.trim();
  const phone = input.phone?.trim() || undefined;
  const requestedPosition = input.requestedPosition?.trim() || undefined;
  const newPassword = input.newPassword?.trim() || undefined;

  if (!fullName || !email) {
    throw new Error("missing_identity_fields");
  }
  if (newPassword && newPassword.length < 8) {
    throw new Error("password_too_short");
  }

  if (!hasDatabaseUrl()) {
    const store = await readStore();
    const actor = store.users.find((entry) => entry.id === input.actorUserId);
    const target = store.users.find((entry) => entry.id === input.targetUserId);

    const actorPerms = actor ? await getUserPermissions(actor) : new Set();
    const canManageUsers = actorPerms.has("manage_site_users");

    if (!actor || (!canManageUsers && actor.id !== input.targetUserId)) {
      throw new Error("unauthorized");
    }
    if (!target) {
      throw new Error("user_not_found");
    }

    const duplicate = store.users.find(
      (entry) => entry.id !== input.targetUserId && normalizeEmail(entry.email) === email
    );
    if (duplicate) {
      throw new Error("email_in_use");
    }

    target.fullName = fullName;
    target.email = email;
    target.phone = phone;
    target.requestedPosition = requestedPosition;
    if (newPassword) {
      target.passwordHash = await hashPassword(newPassword);
    }
    target.updatedAt = new Date().toISOString();
    await writeStore(store);
    return target;
  }

  const [actor, target, duplicate] = await Promise.all([
    getPrismaClient().user.findUnique({ where: { id: input.actorUserId } }),
    getPrismaClient().user.findUnique({ where: { id: input.targetUserId } }),
    getPrismaClient().user.findUnique({ where: { email } })
  ]);

  const actorPerms = actor
    ? await getUserPermissions({ id: actor.id, email: actor.email, role: actor.role as Role })
    : new Set();
  const canManageUsers = actorPerms.has("manage_site_users");

  if (!actor || (!canManageUsers && actor.id !== input.targetUserId)) {
    throw new Error("unauthorized");
  }
  if (!target) {
    throw new Error("user_not_found");
  }
  if (duplicate && duplicate.id !== target.id) {
    throw new Error("email_in_use");
  }

  await getPrismaClient().user.update({
    where: { id: target.id },
    data: {
      fullName,
      email,
      phone: phone ?? null,
      requestedPosition: requestedPosition ?? null,
      passwordHash: newPassword ? await hashPassword(newPassword) : undefined
    }
  });
}
