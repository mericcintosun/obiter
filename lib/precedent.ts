// The precedent layer. A precedent is one controller decision compiled into a
// named, typed matching rule.
//
// Two properties matter more than anything else here:
//   1. The model writes a rule exactly once. After that the rule runs in the
//      deterministic executor below, so the same queue always produces the same
//      closures. No model call sits between a record and its outcome.
//   2. Every closure carries the precedent id that caused it, so reverting a
//      precedent is a single pass over the queue.

import { z } from "zod";
import {
  type ReconException,
  exceptionKindLabels,
  formatMoney,
  shortfall,
  shortfallPct,
} from "@/lib/data";

export const precedentActions = [
  "close_as_rounding",
  "close_as_fx_variance",
  "close_as_timing",
  "split_match",
  "reverse_duplicate",
  "match_on_reference",
  "hold_for_review",
] as const;

export const precedentScopeLevels = [
  "counterparty",
  "counterparty_group",
  "all_counterparties",
] as const;

export const exceptionKinds = [
  "short_payment",
  "fx_difference",
  "batched_remittance",
  "late_settlement",
  "duplicate_fee",
  "reference_mismatch",
] as const;

export const precedentActionLabels: Record<(typeof precedentActions)[number], string> = {
  close_as_rounding: "Close as rounding",
  close_as_fx_variance: "Close as FX variance",
  close_as_timing: "Close as timing",
  split_match: "Split the batch and match",
  reverse_duplicate: "Reverse the duplicate debit",
  match_on_reference: "Match on the stated reference",
  hold_for_review: "Hold for review",
};

export const precedentScopeLabels: Record<(typeof precedentScopeLevels)[number], string> = {
  counterparty: "This counterparty",
  counterparty_group: "This counterparty group",
  all_counterparties: "All counterparties",
};

/**
 * The contract the model has to hit. Anything that fails this schema is thrown
 * away and the deterministic draft is used instead, so a bad generation cannot
 * reach the queue.
 */
export const precedentRuleSchema = z.object({
  id: z.string().regex(/^PREC-\d{2,3}$/),
  name: z.string().min(8).max(90),
  kind: z.enum(exceptionKinds),
  conditions: z.object({
    maxAbsDelta: z.number().min(0).max(250000),
    maxDeltaPct: z.number().min(0).max(100),
    maxDaysApart: z.number().int().min(0).max(30),
    currencies: z.array(z.string().length(3)).min(1).max(6),
    requireBatchSumMatch: z.boolean(),
  }),
  scope: z.object({
    level: z.enum(precedentScopeLevels),
    value: z.string().min(1).max(80),
  }),
  action: z.enum(precedentActions),
  rationale: z.string().min(12).max(400),
  authoredBy: z.string().min(2).max(80),
  compiledFrom: z.string().min(3).max(20),
  compiledAt: z.string().min(4).max(40),
});

export type PrecedentRule = z.infer<typeof precedentRuleSchema>;
export type PrecedentAction = (typeof precedentActions)[number];
export type PrecedentScopeLevel = (typeof precedentScopeLevels)[number];

export interface ControllerDecision {
  exceptionId: string;
  action: PrecedentAction;
  toleranceAmount: number;
  scopeLevel: PrecedentScopeLevel;
  rationale: string;
  decidedBy: string;
}

/** JSON Schema handed to the model as a tool definition. Kept in step with the zod schema above. */
export const precedentJsonSchema = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description:
        "A short human name for the rule, at most 90 characters. Name the pattern, not the single record.",
    },
    kind: { type: "string", enum: [...exceptionKinds] },
    conditions: {
      type: "object",
      properties: {
        maxAbsDelta: { type: "number", description: "Tolerance in currency units, absolute." },
        maxDeltaPct: { type: "number", description: "Tolerance as a percentage of the invoice." },
        maxDaysApart: { type: "integer", description: "Days between due date and settlement." },
        currencies: { type: "array", items: { type: "string" } },
        requireBatchSumMatch: {
          type: "boolean",
          description:
            "True only when the rule closes a batched remittance by proving the open invoices sum to the transfer.",
        },
      },
      required: ["maxAbsDelta", "maxDeltaPct", "maxDaysApart", "currencies", "requireBatchSumMatch"],
    },
    scope: {
      type: "object",
      properties: {
        level: { type: "string", enum: [...precedentScopeLevels] },
        value: { type: "string" },
      },
      required: ["level", "value"],
    },
    action: { type: "string", enum: [...precedentActions] },
    rationale: {
      type: "string",
      description: "Two sentences at most, written for an auditor reading this in six months.",
    },
  },
  required: ["name", "kind", "conditions", "scope", "action", "rationale"],
};

// ---------------------------------------------------------------------------
// Deterministic executor
// ---------------------------------------------------------------------------

export function scopeValueFor(exception: ReconException, level: PrecedentScopeLevel): string {
  if (level === "counterparty") return exception.counterparty;
  if (level === "counterparty_group") return exception.counterpartyGroup;
  return "All counterparties";
}

function scopeMatches(rule: PrecedentRule, exception: ReconException): boolean {
  if (rule.scope.level === "all_counterparties") return true;
  return scopeValueFor(exception, rule.scope.level) === rule.scope.value;
}

/**
 * A batched remittance closes only when the open invoices sharing that transfer
 * add up to the transfer, to the cent. This is a fact about the data, not a
 * tolerance, which is why it bypasses the delta thresholds.
 */
function batchSumMatches(exception: ReconException, queue: ReconException[]): boolean {
  const legs = queue.filter(
    (candidate) =>
      candidate.counterparty === exception.counterparty &&
      candidate.settlementDate === exception.settlementDate &&
      Math.abs(candidate.receivedAmount - exception.receivedAmount) < 0.005
  );
  if (legs.length < 2) return false;
  const sum = legs.reduce((total, leg) => total + leg.invoiceAmount, 0);
  return Math.abs(sum - exception.receivedAmount) < 0.01;
}

export function matchesPrecedent(
  rule: PrecedentRule,
  exception: ReconException,
  queue: ReconException[]
): boolean {
  if (rule.action === "hold_for_review") return false;
  if (rule.kind !== exception.kind) return false;
  if (!scopeMatches(rule, exception)) return false;
  if (!rule.conditions.currencies.includes(exception.currency)) return false;

  if (rule.conditions.requireBatchSumMatch) {
    return batchSumMatches(exception, queue);
  }

  if (Math.abs(shortfall(exception)) > rule.conditions.maxAbsDelta + 1e-9) return false;
  if (shortfallPct(exception) > rule.conditions.maxDeltaPct + 1e-9) return false;
  if (exception.daysApart > rule.conditions.maxDaysApart) return false;
  return true;
}

/** Ids the rule would close if it were applied to this queue right now. */
export function previewPrecedent(
  rule: PrecedentRule,
  queue: ReconException[]
): string[] {
  return queue.filter((exception) => matchesPrecedent(rule, exception, queue)).map((e) => e.id);
}

export function nextPrecedentId(existing: string[]): string {
  const highest = existing.reduce((max, id) => {
    const parsed = Number.parseInt(id.replace("PREC-", ""), 10);
    return Number.isFinite(parsed) && parsed > max ? parsed : max;
  }, 0);
  return `PREC-${String(highest + 1).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Deterministic draft: the fallback rule, and the shape the model is asked to beat
// ---------------------------------------------------------------------------

export interface DraftInput {
  exception: ReconException;
  decision: ControllerDecision;
  queue: ReconException[];
  nextId: string;
  compiledAt: string;
}

function ceil2(value: number): number {
  return Math.ceil(value * 100) / 100;
}

function ruleName(
  exception: ReconException,
  decision: ControllerDecision,
  scopeValue: string,
  maxDaysApart: number
): string {
  const kind = exception.kind;
  if (kind === "batched_remittance") return `Batch remittance split for ${scopeValue}`;
  if (kind === "late_settlement")
    return `Exact match up to ${maxDaysApart} days after cutoff, ${scopeValue}`;
  if (kind === "duplicate_fee") return `Duplicate processor debit on ${scopeValue}`;
  if (kind === "reference_mismatch") return `Reference match by purchase order, ${scopeValue}`;
  if (kind === "fx_difference")
    return `FX variance up to ${formatMoney(decision.toleranceAmount, exception.currency)}, ${scopeValue}`;
  return `Rounding shortfall up to ${formatMoney(decision.toleranceAmount, exception.currency)}, ${scopeValue}`;
}

/**
 * Builds a valid rule with no model in the loop. This runs as the offline
 * fallback and it is also the starting point the model is shown, so the two
 * paths cannot drift into different shapes.
 */
export function draftPrecedent(input: DraftInput): PrecedentRule {
  const { exception, decision, queue, nextId, compiledAt } = input;
  const scopeValue = scopeValueFor(exception, decision.scopeLevel);

  const neighbourhood = queue.filter(
    (candidate) =>
      candidate.kind === exception.kind &&
      (decision.scopeLevel === "all_counterparties" ||
        scopeValueFor(candidate, decision.scopeLevel) === scopeValue)
  );

  const observedPct = neighbourhood.reduce((max, e) => Math.max(max, shortfallPct(e)), 0);
  const observedDays = neighbourhood.reduce((max, e) => Math.max(max, e.daysApart), 0);
  const currencies = Array.from(new Set(neighbourhood.map((e) => e.currency)));
  const isBatch = decision.action === "split_match";

  // Clamped to the same bounds the schema enforces, so the offline draft can
  // never produce a rule the validator would have thrown out.
  const maxDeltaPct = isBatch ? 100 : Math.min(100, Math.max(0.5, ceil2(observedPct)));
  const maxDaysApart = Math.min(30, Math.max(2, observedDays));

  return {
    id: nextId,
    name: ruleName(exception, decision, scopeValue, maxDaysApart),
    kind: exception.kind,
    conditions: {
      maxAbsDelta: isBatch ? 250000 : Math.min(250000, ceil2(Math.max(0, decision.toleranceAmount))),
      maxDeltaPct,
      maxDaysApart,
      currencies: currencies.length > 0 ? currencies : [exception.currency],
      requireBatchSumMatch: isBatch,
    },
    scope: { level: decision.scopeLevel, value: scopeValue },
    action: decision.action,
    rationale:
      decision.rationale.trim().length >= 12
        ? decision.rationale.trim()
        : `${exceptionKindLabels[exception.kind]} on ${scopeValue} inside the stated tolerance, seen ${exception.priorOccurrences} times in the last six closes and never disputed.`,
    authoredBy: decision.decidedBy,
    compiledFrom: exception.id,
    compiledAt,
  };
}

/**
 * Takes whatever the model produced, fills in the fields the model is not
 * allowed to choose (id, provenance, timestamps), and validates. Returns null
 * when the output cannot be trusted, which pushes the caller onto the draft.
 */
export function adoptModelRule(
  raw: unknown,
  input: DraftInput
): PrecedentRule | null {
  if (typeof raw !== "object" || raw === null) return null;
  const candidate = {
    ...(raw as Record<string, unknown>),
    id: input.nextId,
    authoredBy: input.decision.decidedBy,
    compiledFrom: input.exception.id,
    compiledAt: input.compiledAt,
  };
  const parsed = precedentRuleSchema.safeParse(candidate);
  if (!parsed.success) return null;

  // Guard rail the model cannot talk its way past: a rule may never widen the
  // scope beyond what the controller chose.
  if (parsed.data.scope.level !== input.decision.scopeLevel) return null;
  if (parsed.data.kind !== input.exception.kind) return null;
  return parsed.data;
}
