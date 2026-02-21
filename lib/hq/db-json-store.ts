import { hasDatabaseUrl } from "@/lib/db-env";
import { getPrismaClient } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type JsonRecord = Record<string, unknown>;

const ROOT_KEY = "__hqStores";

function cloneDefault<T>(defaultValue: T): T {
  return JSON.parse(JSON.stringify(defaultValue)) as T;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" ? (value as JsonRecord) : {};
}

function readStoreValue<T>(equipmentSizes: unknown, storeKey: string, defaultValue: T): T {
  const root = asRecord(equipmentSizes);
  const bag = asRecord(root[ROOT_KEY]);
  const value = bag[storeKey];
  if (value === undefined) {
    return cloneDefault(defaultValue);
  }
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return cloneDefault(defaultValue);
  }
}

async function getAnchorUser() {
  const prisma = getPrismaClient();
  return prisma.user.findFirst({
    where: {
      OR: [{ email: "ops@pghwarriorhockey.org" }, { role: "super_admin" }, { role: "admin" }]
    },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true, equipmentSizes: true }
  });
}

export async function readDbJsonStore<T>(storeKey: string, defaultValue: T): Promise<T> {
  if (!hasDatabaseUrl()) {
    return cloneDefault(defaultValue);
  }
  const anchor = await getAnchorUser();
  if (!anchor) {
    return cloneDefault(defaultValue);
  }
  return readStoreValue(anchor.equipmentSizes, storeKey, defaultValue);
}

export async function writeDbJsonStore<T>(storeKey: string, value: T): Promise<void> {
  if (!hasDatabaseUrl()) {
    return;
  }
  const anchor = await getAnchorUser();
  if (!anchor) {
    return;
  }
  const root = asRecord(anchor.equipmentSizes);
  const bag = asRecord(root[ROOT_KEY]);
  bag[storeKey] = value as unknown;
  root[ROOT_KEY] = bag;

  await getPrismaClient().user.update({
    where: { id: anchor.id },
    data: {
      equipmentSizes: root as Prisma.InputJsonValue
    }
  });
}
