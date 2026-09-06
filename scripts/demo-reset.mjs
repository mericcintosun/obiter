// npm run demo:reset
//
// Puts the whole system back at the start of DEMO.md: 24 open exceptions and 61
// percent autonomy, with no precedent written today and no settlement pulled.
// Run it between takes.
//
// "The whole system" is a short list, and that is on purpose. There is no chain
// in this repo: no contracts/ directory, no wallet, no on-chain fixture, so
// there is no second half to reset. The only mutable state Obiter has is the
// close journal, and the August 2026 seed in lib/data.ts is a file that is never
// written to. So a reset is a delete of three tables scoped to one close id,
// which is idempotent by construction: running it twice deletes zero the second
// time.
//
// This is a script, not a route, so it may read the environment directly and
// talk to Postgres directly. Same shape as scripts/db-seed.mjs.

import postgres from "postgres";

try {
  process.loadEnvFile?.(".env.local");
} catch {
  // No .env.local. That is fine.
}

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const CLOSE_ID = process.env.OBITER_CLOSE_ID ?? "halden-2026-08";

/** The state DEMO.md step 1 opens on, in words, printed however the reset ran. */
function printExpectedStart() {
  console.log("demo:reset: the close screen should now show");
  console.log("  24 open exceptions across six patterns");
  console.log("  62 exceptions raised this period");
  console.log("  38 closures carried in from June and July");
  console.log("  PREC-01 and PREC-02 on file, nothing written today");
  console.log("  autonomy 61 percent");
}

if (!DATABASE_URL) {
  console.log("demo:reset: no DATABASE_URL is set, so there is nothing to delete.");
  console.log(
    "demo:reset: without one the close journal is the in-process store in lib/store.ts, which lives in the running server and nowhere else."
  );
  console.log(
    'demo:reset: restart the dev server, or press "Reset the close" on /close, and the journal is empty again.'
  );
  printExpectedStart();
  process.exit(0);
}

const sql = postgres(DATABASE_URL, { prepare: false, max: 1, idle_timeout: 20 });

try {
  const closures = await sql`delete from closures where close_id = ${CLOSE_ID} returning exception_id`;
  const live = await sql`delete from live_exceptions where close_id = ${CLOSE_ID} returning id`;
  const precedents = await sql`delete from precedents where close_id = ${CLOSE_ID} returning id`;

  console.log(`demo:reset: close ${CLOSE_ID} is back at the August 2026 baseline.`);
  console.log(`  closures removed         ${closures.length}`);
  console.log(`  live settlements removed ${live.length}`);
  console.log(`  precedents removed       ${precedents.length}`);
  printExpectedStart();
} catch (error) {
  console.error("demo:reset: could not clear the close.");
  console.error(`demo:reset: ${error instanceof Error ? error.message : error}`);
  console.error("demo:reset: if the tables do not exist yet, run `npm run db:push` first.");
  await sql.end({ timeout: 5 });
  process.exit(1);
}

await sql.end({ timeout: 5 });
