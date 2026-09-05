// npm run db:push
//
// Applies drizzle/0000_init.sql to the database named by DATABASE_URL. Every
// statement in that file is `create table if not exists`, so running this twice
// is a no-op rather than an error, and running it against a database that
// already carries a close leaves the rows alone.
//
// There is no drizzle-kit in this repo. The schema is three tables; a hand
// written SQL file plus the pgTable mirror in lib/db/schema.ts is easier to
// review than a generated migration folder.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

// Node 20.12+ reads a dotenv file without a dependency. If it is not there, the
// environment is expected to carry DATABASE_URL already.
try {
  process.loadEnvFile?.(".env.local");
} catch {
  // No .env.local. That is fine.
}

const DATABASE_URL = process.env.DATABASE_URL ?? "";

if (!DATABASE_URL) {
  console.error("db:push: DATABASE_URL is not set.");
  console.error(
    "db:push: put your Neon pooled connection string in .env.local as DATABASE_URL, including ?sslmode=require, then run this again."
  );
  process.exit(1);
}

const SCHEMA = fileURLToPath(new URL("../drizzle/0000_init.sql", import.meta.url));
const source = readFileSync(SCHEMA, "utf8");

// Split on statement terminators. The file carries no function bodies and no
// string literals with semicolons in them, so this stays a safe split.
const statements = source
  .split(";")
  .map((statement) => statement.trim())
  .filter((statement) => statement.length > 0 && !statement.split("\n").every((line) => line.trim().startsWith("--")));

const sql = postgres(DATABASE_URL, { prepare: false, max: 1, idle_timeout: 20 });

try {
  for (const statement of statements) {
    await sql.unsafe(statement);
  }
  console.log(`db:push: applied ${statements.length} statements from drizzle/0000_init.sql.`);
  console.log("db:push: tables precedents, closures and live_exceptions are in place.");
  console.log("db:push: run `npm run db:seed` to clear this close back to the August 2026 baseline.");
} catch (error) {
  console.error("db:push: the database refused the schema.");
  console.error(`db:push: ${error instanceof Error ? error.message : error}`);
  await sql.end({ timeout: 5 });
  process.exit(1);
}

await sql.end({ timeout: 5 });
