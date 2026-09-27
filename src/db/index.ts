import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Cliente Postgres criado sob demanda: o app também roda com Firestore,
 * então faltar DATABASE_URL não pode quebrar o import dos módulos.
 */
const globalForDb = globalThis as typeof globalThis & {
  __gbrPool?: Pool;
  __gbrDb?: NodePgDatabase<typeof schema>;
};

export function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL não configurada. Use Firebase (Firestore) ou informe a string de conexão do Postgres.",
    );
  }
  return url;
}

export function getPool() {
  if (!globalForDb.__gbrPool) {
    globalForDb.__gbrPool = new Pool({
      connectionString: databaseUrl(),
      max: process.env.NODE_ENV === "production" ? 5 : 3,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return globalForDb.__gbrPool;
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (!globalForDb.__gbrDb) {
    globalForDb.__gbrDb = drizzle(getPool(), { schema });
  }
  return globalForDb.__gbrDb;
}

export { schema };
