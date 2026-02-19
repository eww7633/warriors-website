import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getPrismaClient } from "@/lib/prisma";
import { hasDatabaseUrl } from "@/lib/db-env";
import { readStore, writeStore } from "@/lib/hq/store";

export const SESSION_COOKIE = "warriors_session";

function addDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function useDatabaseBackend() {
  return hasDatabaseUrl();
}

export async function createSessionRecord(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = addDays(14);

  if (useDatabaseBackend()) {
    await getPrismaClient().session.deleteMany({
      where: {
        OR: [{ expiresAt: { lte: new Date() } }, { userId }]
      }
    });

    await getPrismaClient().session.create({
      data: {
        token,
        userId,
        expiresAt
      }
    });

    return { token, expiresAt: expiresAt.toISOString() };
  }

  const store = await readStore();
  store.sessions = store.sessions.filter((session) => new Date(session.expiresAt) > new Date());
  store.sessions.push({ token, userId, expiresAt: expiresAt.toISOString() });
  await writeStore(store);

  return { token, expiresAt: expiresAt.toISOString() };
}

export async function destroySessionByToken(token?: string) {
  if (!token) {
    return;
  }

  if (useDatabaseBackend()) {
    await getPrismaClient().session.deleteMany({ where: { token } });
    return;
  }

  const store = await readStore();
  store.sessions = store.sessions.filter((session) => session.token !== token);
  await writeStore(store);
}

export async function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    if (useDatabaseBackend()) {
      const session = await getPrismaClient().session.findUnique({
        where: { token },
        include: { user: true }
      });

      if (!session || session.expiresAt <= new Date()) {
        return null;
      }

      return {
        id: session.user.id,
        fullName: session.user.fullName,
        email: session.user.email,
        passwordHash: session.user.passwordHash,
        requestedPosition: session.user.requestedPosition ?? undefined,
        phone: session.user.phone ?? undefined,
        role: session.user.role as "public" | "player" | "admin",
        status: session.user.status as "pending" | "approved" | "rejected",
        activityStatus: (session.user.activityStatus as "active" | "inactive") ?? "active",
        rosterId: session.user.rosterId ?? undefined,
        jerseyNumber: session.user.jerseyNumber ?? undefined,
        equipmentSizes: (session.user.equipmentSizes as Record<string, string>) ?? {},
        createdAt: session.user.createdAt.toISOString(),
        updatedAt: session.user.updatedAt.toISOString()
      };
    }

    const store = await readStore();
    const session = store.sessions.find((entry) => entry.token === token);

    if (!session || new Date(session.expiresAt) <= new Date()) {
      return null;
    }

    return store.users.find((user) => user.id === session.userId) ?? null;
  } catch {
    return null;
  }
}
