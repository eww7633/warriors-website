export function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_PRISMA_URL;
}

export function hasDatabaseUrl() {
  return Boolean(getDatabaseUrl());
}
