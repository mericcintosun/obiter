// The seam.
//
// Every page and every route handler reads the close through this file, so the
// thing behind it can be swapped without touching a page. As of Phase 2 the
// close is the seed in lib/data.ts composed with a durable journal from
// lib/store.ts, and app/close/page.tsx still calls exactly one function.
//
// ADAPTER_MODE decides which compiler runs and which store answers:
//
//   fake  (the default, and anything that is not exactly "real")
//         The precedent compiles from the checked-in answers in
//         fixtures/precedent/ through lib/fake-compiler.ts, and the journal is
//         the in-process one in lib/store.ts. No API key, no database, no
//         network. The demo path is clickable on a laptop with no accounts, and
//         it still runs the Zod validation, so a bad fixture is rejected exactly
//         like a bad model answer.
//
//   real  The live chain in lib/agent.ts (Claude through the Anthropic API, then
//         the developer's local `claude` CLI, then the deterministic draft), and
//         Postgres on Neon behind the journal. This is the path the submitted
//         recording has to run on.
//
// Defaulting to fake is deliberate. Before this seam existed the compile step
// silently changed code paths depending on whether a key or a binary happened to
// be on the machine, which is the one thing a demo cannot afford.

import { carriedPrecedents, closeSummary, openExceptions } from "@/lib/data";
import type { CompileResult } from "@/lib/agent";
import { adapterMode, LOG_PREFIX, type AdapterMode } from "@/lib/config";
import { compileCacheKey, readCompileCache, writeCompileCache } from "@/lib/cache";
import { compilePrecedentFromFixtures } from "@/lib/fake-compiler";
import { fetchLatestSettlement, type IncomingSettlement } from "@/lib/dodo";
import type { DraftInput } from "@/lib/precedent";
import { closeStore, emptyJournal } from "@/lib/store";
import type { CloseState } from "@/lib/types";

export { adapterMode };
export type { AdapterMode };

/**
 * The whole close screen in one call: the August 2026 seed, plus whatever the
 * ledger recorded on top of it.
 *
 * This function never throws. A journal read that fails logs once and returns
 * the seed with an empty journal, because a database being down should cost the
 * controller their precedents for that page load, not the close screen itself.
 */
export async function getCloseState(): Promise<CloseState> {
  try {
    const journal = await closeStore().readJournal();
    return {
      summary: closeSummary,
      carried: carriedPrecedents,
      // Settlements that arrived during the close sit at the end of the queue,
      // in the order they were pulled, exactly where they were on screen.
      open: [...openExceptions, ...journal.live],
      journal,
    };
  } catch {
    console.warn(`${LOG_PREFIX} store unavailable, serving the seed`);
    return {
      summary: closeSummary,
      carried: carriedPrecedents,
      open: openExceptions,
      journal: emptyJournal(),
    };
  }
}

/**
 * One controller decision to one typed rule. The only place a model may run.
 *
 * The cache sits in front of both modes so two takes of the same decision render
 * identically, down to the elapsed milliseconds printed on the proposal card.
 *
 * lib/agent.ts is imported lazily on purpose: it pulls in node:child_process for
 * the local `claude` CLI path, and in fake mode nothing should drag that into a
 * module graph that a server component also sits in.
 */
export async function compilePrecedentViaAdapter(input: DraftInput): Promise<CompileResult> {
  const key = compileCacheKey(input);
  const cached = readCompileCache(key);
  if (cached) return cached;

  let result: CompileResult;
  if (adapterMode() === "real") {
    const { compilePrecedent } = await import("@/lib/agent");
    result = await compilePrecedent(input);
  } else {
    result = await compilePrecedentFromFixtures(input);
  }

  writeCompileCache(key, result);
  return result;
}

/**
 * One settlement, newest first. `fetchLatestSettlement` already falls back to
 * the fixtures in lib/dodo.ts when no Dodo key is set, so this stays a delegate.
 * The mode is recorded on the exception the route builds, not on the settlement,
 * because IncomingSettlement is the shape Dodo hands us and it does not know
 * this app has modes.
 */
export async function getLatestSettlement(sequence: number): Promise<IncomingSettlement> {
  return fetchLatestSettlement(sequence);
}
