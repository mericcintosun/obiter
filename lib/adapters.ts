// The seam.
//
// Every page and every route handler reads the close through this file, so the
// thing behind it can be swapped without touching a page. Today both modes read
// the seed in lib/data.ts. Phase 2 points the `real` branch at Postgres through
// Drizzle and changes zero page files.
//
// ADAPTER_MODE decides which compiler runs:
//
//   fake  (the default, and anything that is not exactly "real")
//         The precedent compiles from the checked-in answers in
//         fixtures/precedent/ through lib/fake-compiler.ts. No API key, no local
//         `claude` binary, no network. The demo path is clickable on a laptop
//         with no accounts, and it still runs the Zod validation, so a bad
//         fixture is rejected exactly like a bad model answer.
//
//   real  The live chain in lib/agent.ts: Claude through the Anthropic API,
//         then the developer's local `claude` CLI, then the deterministic draft.
//         This is the path the submitted recording has to run on.
//
// Defaulting to fake is deliberate. Before this seam existed the compile step
// silently changed code paths depending on whether a key or a binary happened to
// be on the machine, which is the one thing a demo cannot afford.

import { carriedPrecedents, closeSummary, openExceptions } from "@/lib/data";
import type { CompileResult } from "@/lib/agent";
import { compilePrecedentFromFixtures } from "@/lib/fake-compiler";
import { fetchLatestSettlement, type IncomingSettlement } from "@/lib/dodo";
import type { DraftInput } from "@/lib/precedent";
import type { CloseState } from "@/lib/types";

export type AdapterMode = "fake" | "real";

/** Anything that is not exactly "real" is fake. Absence of a key is not a mode. */
export function adapterMode(): AdapterMode {
  return process.env.ADAPTER_MODE === "real" ? "real" : "fake";
}

/**
 * The whole close screen in one call. Both modes return the same seed in this
 * phase; the split exists so Phase 2 has somewhere to put the database read.
 */
export async function getCloseState(): Promise<CloseState> {
  return {
    summary: closeSummary,
    carried: carriedPrecedents,
    open: openExceptions,
  };
}

/**
 * One controller decision to one typed rule. The only place a model may run.
 *
 * lib/agent.ts is imported lazily on purpose: it pulls in node:child_process for
 * the local `claude` CLI path, and in fake mode nothing should drag that into a
 * module graph that a server component also sits in.
 */
export async function compilePrecedentViaAdapter(input: DraftInput): Promise<CompileResult> {
  if (adapterMode() === "real") {
    const { compilePrecedent } = await import("@/lib/agent");
    return compilePrecedent(input);
  }
  return compilePrecedentFromFixtures(input);
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
