// A small in-process cache for compiled precedents.
//
// The demo is recorded in takes. Take two compiles the same decision on the same
// queue, and without this it can come back with a differently worded rationale,
// a different elapsed time, and a different rule name, which makes the two takes
// uncuttable. With it, the same decision renders identically for as long as the
// server process lives.
//
// Everything about it is deliberately boring: a Map, an insertion-order eviction
// when it grows past COMPILE_CACHE_MAX, and no filesystem write of any kind,
// because a Vercel route handler may not write at request time.
//
// The key deliberately leaves out `compiledAt`. That is the only field that
// moves between two identical decisions, and pinning it is the whole point: a
// cache hit replays the first take's timestamp rather than minting a new one.

import { COMPILE_CACHE_MAX, JOURNAL_KEY_MAX } from "@/lib/config";
import type { CompileResult } from "@/lib/agent";
import type { DraftInput } from "@/lib/precedent";

const entries = new Map<string, CompileResult>();

/** FNV-1a over the canonical input. Short, stable, and no crypto import. */
function hash(text: string): string {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value.toString(16).padStart(8, "0");
}

/**
 * Everything the compiler actually reads, in a fixed order, with the queue
 * reduced to sorted ids so a reordered queue is still the same question.
 */
export function compileCacheKey(input: DraftInput): string {
  const canonical = JSON.stringify({
    exceptionId: input.exception.id,
    action: input.decision.action,
    toleranceAmount: input.decision.toleranceAmount,
    scopeLevel: input.decision.scopeLevel,
    rationale: input.decision.rationale,
    decidedBy: input.decision.decidedBy,
    queue: [...input.queue.map((exception) => exception.id)].sort(),
    nextId: input.nextId,
  });
  return hash(canonical);
}

export function readCompileCache(key: string): CompileResult | null {
  return entries.get(key) ?? null;
}

export function writeCompileCache(key: string, result: CompileResult): void {
  entries.set(key, result);
  while (entries.size > COMPILE_CACHE_MAX) {
    // Map iterates in insertion order, so the first key is the oldest.
    const oldest = entries.keys().next();
    if (oldest.done) break;
    entries.delete(oldest.value);
  }
}

// ---------------------------------------------------------------------------
// Journal idempotency keys.
// ---------------------------------------------------------------------------

const journalKeys = new Set<string>();

/**
 * Records one journal write's idempotency key. Returns false when this instance
 * has already seen it, which is the caller's signal that the write is a repeat.
 *
 * Be honest about what this is and is not. It is a Set in one server process,
 * so it catches a double click that lands twice on the same instance, and it
 * catches nothing at all across two instances or after a restart. The durable
 * half is the natural keys in lib/store.ts: `onConflictDoUpdate` on
 * `precedents`, `onConflictDoNothing` on `closures` and `live_exceptions`. Those
 * are what make a retry safe wherever it lands. This is the cheap first line
 * that keeps a repeat from reaching the database at all.
 */
export function markJournalWrite(key: string): boolean {
  if (journalKeys.has(key)) return false;
  journalKeys.add(key);
  while (journalKeys.size > JOURNAL_KEY_MAX) {
    // A Set iterates in insertion order too, so the first key is the oldest.
    const oldest = journalKeys.values().next();
    if (oldest.done) break;
    journalKeys.delete(oldest.value);
  }
  return true;
}
