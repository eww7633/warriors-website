import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getPrismaClient } from "@/lib/prisma";
import { hasDatabaseUrl } from "@/lib/db-env";
import { readStore, writeStore } from "@/lib/hq/store";
import { MemberUser } from "@/lib/types";

export const SESSION_COOKIE = "warriors_session";

function addDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function useDatabaseBackend() {
  return hasDatabaseUrl();
}

function mapDbUserToMemberUser(user: {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  requestedPosition: string | null;
  phone: string | null;
  role: string;
  status: string;
  activityStatus: string;
  rosterId: string | null;
  jerseyNumber: number | null;
  equipmentSizes: unknown;
  createdAt: Date;
  updatedAt: Date;
}): MemberUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    passwordHash: user.passwordHash,
    requestedPosition: user.requestedPosition ?? undefined,
    phone: user.phone ?? undefined,
    role: user.role as MemberUser["role"],
    status: user.status as MemberUser["status"],
    activityStatus: (user.activityStatus as MemberUser["activityStatus"]) ?? "active",
    rosterId: user.rosterId ?? undefined,
    jerseyNumber: user.jerseyNumber ?? undefined,
    equipmentSizes: (user.equipmentSizes as Record<string, string>) ?? {},
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}

function parseCookieValue(cookieHeader: string | null, key: string) {
  if (!cookieHeader) {
    return "";
  }

  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${key}=`));

  if (!match) {
    return "";
  }

  return decodeURIComponent(match.slice(key.length + 1));
}

export function getBearerTokenFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return "";
  }
  return authHeader.slice(7).trim();
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

export async function getUserBySessionToken(token?: string | null) {
  const normalizedToken = (token || "").trim();
  if (!normalizedToken) {
    return null;
  }

  if (useDatabaseBackend()) {
    const session = await getPrismaClient().session.findUnique({
      where: { token: normalizedToken },
      include: { user: true }
    });

    if (!session || session.expiresAt <= new Date()) {
      return null;
    }

    return mapDbUserToMemberUser(session.user);
  }

  const store = await readStore();
  const session = store.sessions.find((entry) => entry.token === normalizedToken);

  if (!session || new Date(session.expiresAt) <= new Date()) {
    return null;
  }

  return store.users.find((user) => user.id === session.userId) ?? null;
}

export async function getCurrentUserFromRequest(request: Request) {
  const tokenFromBearer = getBearerTokenFromRequest(request);
  const tokenFromCookie = parseCookieValue(request.headers.get("cookie"), SESSION_COOKIE);
  const token = tokenFromBearer || tokenFromCookie;

  try {
    return await getUserBySessionToken(token);
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    return await getUserBySessionToken(token);
  } catch {
    return null;
  }
}
