// The close ledger.
//
// A precedent is supposed to outlive the close it was written in. Until this
// file existed it did not survive a page reload, because every rule, every
// closure and every pulled settlement lived in React state.
//
// One interface, two implementations:
//
//   memoryStore    A module scope journal. The default, and the reason the demo
//                  still works on a laptop with no database: it survives every
//                  navigation inside one server process, and it resets when the
//                  process does. No key, no network, no schema.
//
//   postgresStore  The same journal in Neon through drizzle, scoped by CLOSE_ID,
//                  so a reload on a deployed instance returns the close exactly
//                  as the controller left it.
//
// `closeStore()` picks between them and falls back to memory whenever the
// database is not configured. Nothing in here throws at the caller: a ledger
// that is down degrades to the seed, because a database outage must never take
// the close screen with it.
//
// Server only. Pages and client components reach this through lib/adapters.ts
// or through app/api/close/journal/route.ts, never directly.

import { and, asc, eq } from "drizzle-orm";
import { adapterMode, CLOSE_ID, LOG_PREFIX } from "@/lib/config";
import { db } from "@/lib/db/client";
import { closures, liveExceptions, precedents } from "@/lib/db/schema";
import type { CloseJournal, ClosureRow, PrecedentRule, ReconException } from "@/lib/types";

export type { CloseJournal, ClosureRow };

/** What the apply step writes: one rule plus the records it closed. */
export interface ApplyRecord {
  rule: PrecedentRule;
  closedIds: string[];
  /** The one record a human resolved by hand, or null. */
  humanDecidedId: string | null;
  /** Which compiler wrote the rule, and how long it took. Audit only. */
  source?: string;
  elapsedMs?: number;
}

/** What the settlement step writes: the arrival, and what closed it if anything. */
export interface SettlementRecord {
  exception: ReconException;
  sequence: number;
  closedByPrecedentId: string | null;
}

export interface CloseStore {
  readJournal(): Promise<CloseJournal>;
  recordApply(input: ApplyRecord): Promise<void>;
  recordRevert(precedentId: string): Promise<void>;
  recordSettlement(input: SettlementRecord): Promise<void>;
  reset(): Promise<void>;
}

export function emptyJournal(): CloseJournal {
  return { precedents: [], closures: [], live: [], sequence: 0 };
}

// ---------------------------------------------------------------------------
// memoryStore
// ---------------------------------------------------------------------------

// Module scope on purpose. In a single server process this outlives a request,
// so `npm run dev` with no DATABASE_URL still shows a precedent after a reload.
// It is not shared between serverless instances and it is not durable, which is
// exactly what postgresStore is for.
const journal: CloseJournal = emptyJournal();

export const memoryStore: CloseStore = {
  async readJournal() {
    return {
      precedents: [...journal.precedents],
      closures: [...journal.closures],
      live: [...journal.live],
      sequence: journal.sequence,
    };
  },

  async recordApply({ rule, closedIds, humanDecidedId }) {
    journal.precedents = [...journal.precedents.filter((p) => p.id !== rule.id), rule];
    const alreadyClosed = new Set(journal.closures.map((c) => c.exceptionId));
    for (const exceptionId of closedIds) {
      if (alreadyClosed.has(exceptionId)) continue;
      journal.closures.push({
        exceptionId,
        precedentId: rule.id,
        humanDecided: exceptionId === humanDecidedId,
      });
    }
  },

  async recordRevert(precedentId) {
    journal.precedents = journal.precedents.filter((p) => p.id !== precedentId);
    journal.closures = journal.closures.filter((c) => c.precedentId !== precedentId);
  },

  async recordSettlement({ exception, sequence, closedByPrecedentId }) {
    if (!journal.live.some((e) => e.id === exception.id)) journal.live.push(exception);
    journal.sequence = Math.max(journal.sequence, sequence + 1);
    if (closedByPrecedentId && !journal.closures.some((c) => c.exceptionId === exception.id)) {
      journal.closures.push({
        exceptionId: exception.id,
        precedentId: closedByPrecedentId,
        humanDecided: false,
      });
    }
  },

  async reset() {
    journal.precedents = [];
    journal.closures = [];
    journal.live = [];
    journal.sequence = 0;
  },
};

// ---------------------------------------------------------------------------
// postgresStore
// ---------------------------------------------------------------------------

/**
 * Every method starts here. If the driver is not configured the caller gets a
 * thrown error, which lib/adapters.ts and the journal route both catch: this
 * function is never reached in the default configuration, because closeStore()
 * checks the client before it hands this implementation out.
 */
function database() {
  const connection = db();
  if (!connection) throw new Error("no database configured");
  return connection;
}

export const postgresStore: CloseStore = {
  async readJournal() {
    const connection = database();

    const [ruleRows, closureRows, liveRows] = await Promise.all([
      connection
        .select()
        .from(precedents)
        .where(and(eq(precedents.closeId, CLOSE_ID), eq(precedents.status, "active")))
        .orderBy(asc(precedents.createdAt)),
      connection
        .select()
        .from(closures)
        .where(eq(closures.closeId, CLOSE_ID))
        .orderBy(asc(closures.createdAt)),
      connection
        .select()
        .from(liveExceptions)
        .where(eq(liveExceptions.closeId, CLOSE_ID))
        .orderBy(asc(liveExceptions.sequence)),
    ]);

    return {
      precedents: ruleRows.map((row) => row.rule),
      closures: closureRows.map((row) => ({
        exceptionId: row.exceptionId,
        precedentId: row.precedentId,
        humanDecided: row.humanDecided,
      })),
      live: liveRows.map((row) => row.payload),
      // The next sequence to ask the feed for, not the last one served.
      sequence: liveRows.reduce((next, row) => Math.max(next, row.sequence + 1), 0),
    };
  },

  async recordApply({ rule, closedIds, humanDecidedId, source, elapsedMs }) {
    const connection = database();

    await connection
      .insert(precedents)
      .values({
        id: rule.id,
        closeId: CLOSE_ID,
        rule,
        source: source ?? "unknown",
        elapsedMs: elapsedMs ?? 0,
        compiledFrom: rule.compiledFrom,
        status: "active",
      })
      // Applying the same id again after a revert is a normal move in the demo,
      // so the row comes back to life rather than colliding.
      .onConflictDoUpdate({
        target: [precedents.closeId, precedents.id],
        set: {
          rule,
          source: source ?? "unknown",
          elapsedMs: elapsedMs ?? 0,
          compiledFrom: rule.compiledFrom,
          status: "active",
        },
      });

    if (closedIds.length === 0) return;

    await connection
      .insert(closures)
      .values(
        closedIds.map((exceptionId) => ({
          closeId: CLOSE_ID,
          exceptionId,
          precedentId: rule.id,
          humanDecided: exceptionId === humanDecidedId,
        }))
      )
      // A record that is already closed stays closed under the precedent that
      // closed it first. The client never sends one, and this makes a retry safe.
      .onConflictDoNothing();
  },

  async recordRevert(precedentId) {
    const connection = database();

    await connection
      .delete(closures)
      .where(and(eq(closures.closeId, CLOSE_ID), eq(closures.precedentId, precedentId)));

    // The rule is marked, not deleted. A reverted precedent is part of the
    // record of this close, and an auditor should be able to see it was written.
    await connection
      .update(precedents)
      .set({ status: "reverted" })
      .where(and(eq(precedents.closeId, CLOSE_ID), eq(precedents.id, precedentId)));
  },

  async recordSettlement({ exception, sequence, closedByPrecedentId }) {
    const connection = database();

    await connection
      .insert(liveExceptions)
      .values({ closeId: CLOSE_ID, id: exception.id, payload: exception, sequence })
      .onConflictDoNothing();

    if (!closedByPrecedentId) return;

    await connection
      .insert(closures)
      .values({
        closeId: CLOSE_ID,
        exceptionId: exception.id,
        precedentId: closedByPrecedentId,
        humanDecided: false,
      })
      .onConflictDoNothing();
  },

  async reset() {
    const connection = database();
    await connection.delete(closures).where(eq(closures.closeId, CLOSE_ID));
    await connection.delete(liveExceptions).where(eq(liveExceptions.closeId, CLOSE_ID));
    await connection.delete(precedents).where(eq(precedents.closeId, CLOSE_ID));
  },
};

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

let warned = false;

/**
 * Postgres in real mode when a connection string exists, the in-process journal
 * otherwise. The fallback is the point: a missing or unreachable database drops
 * the app back to the seed instead of taking the close screen down with it.
 */
export function closeStore(): CloseStore {
  if (adapterMode() !== "real") return memoryStore;
  if (db() !== null) return postgresStore;

  if (!warned) {
    warned = true;
    console.warn(`${LOG_PREFIX} store unavailable, serving the seed`);
  }
  return memoryStore;
}
