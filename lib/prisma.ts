import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "@/lib/db-env";

declare global {
  var __prisma: PrismaClient | undefined;
}

export function getPrismaClient() {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error("Database URL is not configured.");
  }

  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      datasources: {
        db: { url }
      }
    });
  }

  return global.__prisma;
}
