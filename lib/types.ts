// The shared vocabulary. Route handlers and the client both import from here,
// so the shape crossing the network is written down once instead of being cast
// into existence on each side.
//
// Nothing in this file computes anything, and every import is `import type`, so
// the file erases to nothing at build time. That is deliberate: a client
// component may import from here without dragging a database driver, a child
// process module, or a server-only config read into its module graph.

import type { Failure } from "@/lib/errors";
import type { IncomingSettlement } from "@/lib/dodo";
import type {
  CarriedPrecedent,
  CloseSummary,
  ExceptionKind,
  ReconException,
} from "@/lib/data";
import type {
  ControllerDecision,
  PrecedentAction,
  PrecedentRule,
  PrecedentScopeLevel,
} from "@/lib/precedent";

export type {
  CarriedPrecedent,
  CloseSummary,
  ControllerDecision,
  ExceptionKind,
  Failure,
  IncomingSettlement,
  PrecedentAction,
  PrecedentRule,
  PrecedentScopeLevel,
  ReconException,
};

/**
 * The failure body. Kept under the old name so every existing import still
 * resolves; the shape is now the typed `Failure` from lib/errors.ts rather than
 * a bare string, so a caller can branch on the code and show the hint.
 */
export type ApiError = Failure;

/** One exception closed under one precedent, as the ledger records it. */
export interface ClosureRow {
  exceptionId: string;
  precedentId: string;
  /** True for the single record the controller resolved by hand. */
  humanDecided: boolean;
}

/**
 * Everything about this close that was written down rather than seeded. The
 * seed in lib/data.ts is the August 2026 baseline and never changes; the
 * journal is what the controller did on top of it, and it is what has to
 * survive a reload.
 */
export interface CloseJournal {
  precedents: PrecedentRule[];
  closures: ClosureRow[];
  /** Settlements pulled during the close, already in exception shape. */
  live: ReconException[];
  /** The next settlement sequence to request. 0 on an untouched close. */
  sequence: number;
}

/**
 * What the client posts to /api/close/journal. One entry per ledger write.
 *
 * `idempotencyKey` is on every member: one key per write, minted by the client,
 * so a double click that gets two requests out of the browser is one write on
 * the far side. It mirrors `journalRequestSchema` in lib/schemas.ts by hand.
 */
export type JournalRequest =
  | {
      op: "apply";
      idempotencyKey: string;
      rule: PrecedentRule;
      closedIds: string[];
      /** The one record a human actually resolved, or null. */
      humanDecidedId: string | null;
      /** Which compiler wrote the rule. Recorded for the audit trail. */
      source?: string;
      elapsedMs?: number;
    }
  | { op: "revert"; idempotencyKey: string; precedentId: string }
  | {
      op: "settlement";
      idempotencyKey: string;
      exception: ReconException;
      sequence: number;
      closedByPrecedentId: string | null;
    }
  | { op: "reset"; idempotencyKey: string };

/**
 * What POST /api/precedent returns. `wouldClose` is computed by the same
 * executor the apply step runs, so the count the controller approves is the
 * count that happens.
 */
export interface CompilePrecedentResponse {
  rule: PrecedentRule;
  /** Which compiler wrote the rule: anthropic, claude-cli, fixture, deterministic. */
  source: string;
  elapsedMs: number;
  /** Set when an earlier compiler in the chain answered and was thrown out. */
  rejectedModelOutput: string | null;
  /** Open exception ids this rule would close, by id. */
  wouldClose: string[];
}

/** What GET /api/settlements returns. */
export interface SettlementResponse {
  settlement: IncomingSettlement;
  exception: ReconException;
}

/**
 * Everything the close screen needs to render: the seed, plus whatever the
 * ledger has recorded on top of it. `open` is the seed queue with any persisted
 * live settlements appended, so a page that only reads `open` still renders a
 * complete queue.
 */
export interface CloseState {
  summary: CloseSummary;
  carried: CarriedPrecedent[];
  open: ReconException[];
  journal: CloseJournal;
}
