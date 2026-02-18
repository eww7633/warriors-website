import crypto from "node:crypto";
import { cookies } from "next/headers";
import { readStore, writeStore } from "@/lib/hq/store";

const SESSION_COOKIE = "warriors_session";

function addDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function createSession(userId: string) {
  const store = await readStore();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = addDays(14).toISOString();

  store.sessions = store.sessions.filter((session) => new Date(session.expiresAt) > new Date());
  store.sessions.push({ token, userId, expiresAt });
  await writeStore(store);

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expiresAt),
    path: "/"
  });
}

export async function destroySession() {
  const token = cookies().get(SESSION_COOKIE)?.value;

  if (token) {
    const store = await readStore();
    store.sessions = store.sessions.filter((session) => session.token !== token);
    await writeStore(store);
  }

  cookies().set(SESSION_COOKIE, "", { expires: new Date(0), path: "/" });
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
