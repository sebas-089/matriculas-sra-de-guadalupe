import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import ws from "ws";
import { loadEnv } from "../lib/env";
import * as schema from "./schema";

loadEnv();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Add it to api-server/.env.local for local development or to the Vercel project environment variables (Neon Postgres connection string).",
  );
}

/** Cadena de conexión ya validada (permite usarla dentro de funciones). */
const connectionString: string = databaseUrl;

/** Canonical database type used across every route of the API. */
export type Database = PostgresJsDatabase<typeof schema>;

/**
 * `postgres` (postgres.js over TCP with `ssl: 'require'`) is the default and
 * works both locally and on Vercel. Set `DATABASE_DRIVER=neon` to use the
 * Neon serverless driver (`@neondatabase/serverless` over WebSockets), which
 * is the recommended option when deploying to Vercel with Neon.
 */
export const databaseDriver: "postgres" | "neon" =
  (process.env.DATABASE_DRIVER ?? "postgres").toLowerCase() === "neon" ? "neon" : "postgres";

const isServerless = Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";

function createPostgresJsDatabase(): Database {
  const client = postgres(connectionString, {
    ssl: "require",
    // Required when talking to the Neon pooled endpoint (PgBouncer transaction mode).
    prepare: false,
    max: isServerless ? 1 : 5,
    idle_timeout: 20,
    connect_timeout: 15,
    onnotice: () => undefined,
  });

  return drizzlePostgres(client, { schema });
}

function createNeonDatabase(): Database {
  neonConfig.webSocketConstructor = ws;
  const pool = new NeonPool({ connectionString });
  return drizzleNeon(pool, { schema }) as unknown as Database;
}

export const db: Database = databaseDriver === "neon" ? createNeonDatabase() : createPostgresJsDatabase();

export * from "./schema";
