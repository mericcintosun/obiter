// npm run seed
//
// Reads the August 2026 close out of lib/data.ts and writes it to
// fixtures/close-august-2026.json as a deterministic snapshot, then prints the
// counts so a human can check them against the close screen without counting
// rows by hand.
//
// Deterministic means byte-identical on every run: the clock is never read, no
// random value is generated, no timestamp of any kind is written, and every
// object is written with its keys in a fixed order. Two runs on a clean checkout
// produce the same file, so a diff on it is always a real change to the seed.
//
// This script imports lib/data.ts directly. That file has no imports and only
// erasable type syntax, so Node 22.18+ and Node 24 strip the types natively and
// no build step is needed.
//
// Phase 2 replaces the write below with an idempotent insert into Postgres. The
// snapshot stays useful as the fixture the database is checked against.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_NODE = "22.18";
const SOURCE = new URL("../lib/data.ts", import.meta.url);
const TARGET = new URL("../fixtures/close-august-2026.json", import.meta.url);

let data;
try {
  data = await import(SOURCE.href);
} catch (error) {
  console.error("seed: could not import lib/data.ts.");
  console.error(
    `seed: this script relies on native TypeScript type stripping, which needs Node ${REQUIRED_NODE} or newer (Node 24 recommended). You are on ${process.version}.`
  );
  console.error(`seed: the underlying error was: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}

const { carriedPrecedents, closeSummary, openExceptions } = data;

if (!closeSummary || !Array.isArray(carriedPrecedents) || !Array.isArray(openExceptions)) {
  console.error("seed: lib/data.ts did not export closeSummary, carriedPrecedents and openExceptions.");
  process.exit(1);
}

if (openExceptions.length === 0) {
  console.error("seed: the open queue is empty. The close screen would render nothing.");
  process.exit(1);
}

// Keys are written out one by one rather than spread, so the field order in the
// snapshot is a decision in this file and not an accident of object literal
// order somewhere else.
const snapshot = {
  entity: closeSummary.entity,
  period: closeSummary.period,
  generatedFrom: "lib/data.ts",
  summary: {
    entity: closeSummary.entity,
    period: closeSummary.period,
    bankLines: closeSummary.bankLines,
    invoices: closeSummary.invoices,
    autoMatched: closeSummary.autoMatched,
    exceptionsRaised: closeSummary.exceptionsRaised,
    closedByCarriedPrecedents: closeSummary.closedByCarriedPrecedents,
  },
  carriedPrecedents: carriedPrecedents.map((precedent) => ({
    id: precedent.id,
    name: precedent.name,
    compiledOn: precedent.compiledOn,
    closedThisPeriod: precedent.closedThisPeriod,
    summary: precedent.summary,
  })),
  openExceptions: openExceptions.map((exception) => ({
    id: exception.id,
    kind: exception.kind,
    counterparty: exception.counterparty,
    counterpartyGroup: exception.counterpartyGroup,
    invoiceNumber: exception.invoiceNumber,
    invoiceAmount: exception.invoiceAmount,
    receivedAmount: exception.receivedAmount,
    currency: exception.currency,
    invoiceDate: exception.invoiceDate,
    settlementDate: exception.settlementDate,
    daysApart: exception.daysApart,
    priorOccurrences: exception.priorOccurrences,
    evidence: [...exception.evidence],
    blockedReason: exception.blockedReason,
  })),
};

const targetPath = fileURLToPath(TARGET);
mkdirSync(dirname(targetPath), { recursive: true });
writeFileSync(targetPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

const patterns = new Set(openExceptions.map((exception) => exception.kind));
const autonomy = Math.round(
  (closeSummary.closedByCarriedPrecedents / closeSummary.exceptionsRaised) * 100
);

console.log(`seed: wrote fixtures/close-august-2026.json for ${snapshot.entity}, ${snapshot.period}.`);
console.log(`  open exceptions       ${openExceptions.length}`);
console.log(`  distinct patterns     ${patterns.size}`);
console.log(`  carried precedents    ${carriedPrecedents.length} (${carriedPrecedents.map((p) => p.id).join(", ")})`);
console.log(`  exceptions raised     ${closeSummary.exceptionsRaised}`);
console.log(`  closed with no human  ${closeSummary.closedByCarriedPrecedents}`);
console.log(`  autonomy              ${autonomy} percent`);
console.log("seed: these are the numbers the close screen computes at render time. If they disagree, the screen is right and this snapshot is stale.");
