// npm run db:seed
//
// Returns one close to its baseline in a single command. The August 2026 seed
// lives in lib/data.ts and is never written to the database, so "seed" here
// means "clear the journal": every precedent, every closure and every pulled
// settlement for this close id goes, and the close screen renders the 24 open
// exceptions and the 61 percent autonomy rate again.
//
// Idempotent by construction. Running it on an already clean close deletes zero
// rows and prints zero.

import postgres from "postgres";

try {
  process.loadEnvFile?.(".env.local");
} catch {
  // No .env.local. That is fine.
}

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const CLOSE_ID = process.env.OBITER_CLOSE_ID ?? "halden-2026-08";

if (!DATABASE_URL) {
  console.error("db:seed: DATABASE_URL is not set.");
  console.error(
    "db:seed: put your Neon pooled connection string in .env.local as DATABASE_URL, including ?sslmode=require, then run this again."
  );
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { prepare: false, max: 1, idle_timeout: 20 });

try {
  const closures = await sql`delete from closures where close_id = ${CLOSE_ID} returning exception_id`;
  const live = await sql`delete from live_exceptions where close_id = ${CLOSE_ID} returning id`;
  const precedents = await sql`delete from precedents where close_id = ${CLOSE_ID} returning id`;

  console.log(`db:seed: close ${CLOSE_ID} is back at the August 2026 baseline.`);
  console.log(`  closures removed        ${closures.length}`);
  console.log(`  live settlements removed ${live.length}`);
  console.log(`  precedents removed      ${precedents.length}`);
  console.log("db:seed: the close screen now renders 24 open exceptions at 61 percent autonomy.");
} catch (error) {
  console.error("db:seed: could not clear the close.");
  console.error(`db:seed: ${error instanceof Error ? error.message : error}`);
  console.error("db:seed: if the tables do not exist yet, run `npm run db:push` first.");
  await sql.end({ timeout: 5 });
  process.exit(1);
}

await sql.end({ timeout: 5 });
