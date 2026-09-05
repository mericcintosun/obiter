// The shared vocabulary. Route handlers and the client both import from here,
// so the shape crossing the network is written down once instead of being cast
// into existence on each side.
//
// Nothing in this file computes anything. It re-exports the domain types that
// already exist and names the three payloads the app moves over HTTP.

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
  IncomingSettlement,
  PrecedentAction,
  PrecedentRule,
  PrecedentScopeLevel,
  ReconException,
};

/** Every handler in this app answers a failure with exactly this body. */
export interface ApiError {
  error: string;
}

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
 * Everything the close screen needs to render. Today this comes from the seed
 * in lib/data.ts through lib/adapters.ts. Phase 2 points the real branch at
 * Postgres and this shape does not move.
 */
export interface CloseState {
  summary: CloseSummary;
  carried: CarriedPrecedent[];
  open: ReconException[];
}
