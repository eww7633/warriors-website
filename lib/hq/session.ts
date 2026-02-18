import crypto from "node:crypto";
import { cookies } from "next/headers";
import { readStore, writeStore } from "@/lib/hq/store";

export const SESSION_COOKIE = "warriors_session";

function addDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function createSessionRecord(userId: string) {
  const store = await readStore();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = addDays(14).toISOString();

  store.sessions = store.sessions.filter((session) => new Date(session.expiresAt) > new Date());
  store.sessions.push({ token, userId, expiresAt });
  await writeStore(store);

  return { token, expiresAt };
}

export async function destroySessionByToken(token?: string) {
  if (token) {
    const store = await readStore();
    store.sessions = store.sessions.filter((session) => session.token !== token);
    await writeStore(store);
  }
}

export async function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const store = await readStore();
  const session = store.sessions.find((entry) => entry.token === token);

  if (!session || new Date(session.expiresAt) <= new Date()) {
    return null;
  }

  return store.users.find((user) => user.id === session.userId) ?? null;
}
