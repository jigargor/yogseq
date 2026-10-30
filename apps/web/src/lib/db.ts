import { createDb, type Db } from "@yogseq/db";

let cachedDb: Db | undefined;

/**
 * Lazy singleton so that importing this module never throws at build time
 * when DATABASE_URL is not available. The connection (neon-http) is only
 * created on first use at runtime.
 */
export function getDb(): Db {
  if (cachedDb) return cachedDb;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");

  cachedDb = createDb(databaseUrl);
  return cachedDb;
}
