// The Postgres connection, created once per server process and never in a page.
//
// `max: 1` and `prepare: false` are the Neon pooled connection settings: the
// pooler in front of Neon multiplexes sessions, so a client that opens a pool of
// its own or leans on named prepared statements will misbehave under it. A
// serverless function does not live long enough to need more than one socket.
//
// Returns null when DATABASE_URL is empty. That is not an error condition: it is
// the default the repo ships in, and lib/store.ts reads it as "serve the seed".
//
// Server only. Everything reaches this through lib/store.ts.

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { DATABASE_URL, DB_TIMEOUT_MS } from "@/lib/config";
import * as schema from "@/lib/db/schema";

export type Database = PostgresJsDatabase<typeof schema>;

let cached: Database | null = null;
let attempted = false;

export function db(): Database | null {
  if (attempted) return cached;
  attempted = true;

  if (!DATABASE_URL) return null;

  const sql = postgres(DATABASE_URL, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: DB_TIMEOUT_MS / 1000,
  });
  cached = drizzle(sql, { schema });
  return cached;
}
