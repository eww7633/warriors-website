import { hasDatabaseUrl } from "@/lib/db-env";
import { getPrismaClient } from "@/lib/prisma";
import { readStore, writeStore } from "@/lib/hq/store";
import { Role } from "@/lib/types";

export async function setUserRole(input: {
  actorUserId: string;
  targetUserId: string;
  role: Role;
}) {
  if (!["public", "player", "admin"].includes(input.role)) {
    throw new Error("Invalid role.");
  }

  if (!hasDatabaseUrl()) {
    const store = await readStore();
    const actor = store.users.find((entry) => entry.id === input.actorUserId);
    const target = store.users.find((entry) => entry.id === input.targetUserId);

    if (!actor || actor.role !== "admin") {
      throw new Error("Only admins can update access.");
    }

    if (!target) {
      throw new Error("Target user not found.");
    }

    if (target.id === actor.id && input.role !== "admin") {
      throw new Error("You cannot remove your own admin access.");
    }

    target.role = input.role;
    if (input.role === "admin") {
      target.status = "approved";
      target.activityStatus = "active";
    }
    if (input.role === "public") {
      target.status = "approved";
      target.activityStatus = "inactive";
      target.rosterId = undefined;
      target.jerseyNumber = undefined;
    }
    if (input.role === "player" && target.status === "rejected") {
      target.status = "pending";
    }
    target.updatedAt = new Date().toISOString();

    await writeStore(store);
    return;
  }

  const [actor, target] = await Promise.all([
    getPrismaClient().user.findUnique({ where: { id: input.actorUserId } }),
    getPrismaClient().user.findUnique({ where: { id: input.targetUserId } })
  ]);

  if (!actor || actor.role !== "admin") {
    throw new Error("Only admins can update access.");
  }
  if (!target) {
    throw new Error("Target user not found.");
  }
  if (target.id === actor.id && input.role !== "admin") {
    throw new Error("You cannot remove your own admin access.");
  }

  const data: {
    role: Role;
    status?: "pending" | "approved" | "rejected";
    activityStatus?: "active" | "inactive";
    rosterId?: string | null;
    jerseyNumber?: number | null;
  } = {
    role: input.role
  };

  if (input.role === "admin") {
    data.status = "approved";
    data.activityStatus = "active";
  }

  if (input.role === "public") {
    data.status = "approved";
    data.activityStatus = "inactive";
    data.rosterId = null;
    data.jerseyNumber = null;
  }

  if (input.role === "player" && target.status === "rejected") {
    data.status = "pending";
  }

  await getPrismaClient().user.update({
    where: { id: input.targetUserId },
    data
  });
}
