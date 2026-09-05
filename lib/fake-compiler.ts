// The offline precedent compiler.
//
// The point of this file, stated plainly: a fixture that fails the same Zod
// validation as a live model answer never reaches the queue, so the offline
// demo path proves the guard rail instead of bypassing it. Every fixture under
// fixtures/precedent/ is shaped exactly like the `input` of the model's
// `emit_precedent` tool_use block, and it goes through `adoptModelRule` on the
// way in, which is the same function `lib/agent.ts` calls on a live answer. If a
// fixture widens the controller's scope, changes the pattern, or breaks a bound
// in the schema, it is thrown out and the deterministic draft runs instead.
//
// This is what makes `ADAPTER_MODE=fake` the default: the whole demo flow is
// clickable with no API key, no local `claude` binary, and no network, and it
// exercises the validation path rather than skipping it.
//
// Fixtures are imported statically with resolveJsonModule. Nothing here reads
// the filesystem, because a Vercel route handler may not.

import batchedRemittanceFixture from "@/fixtures/precedent/batched_remittance.json";
import lateSettlementFixture from "@/fixtures/precedent/late_settlement.json";
import shortPaymentFixture from "@/fixtures/precedent/short_payment.json";
import type { CompileResult } from "@/lib/agent";
import type { ExceptionKind } from "@/lib/data";
import {
  adoptModelRule,
  draftPrecedent,
  precedentScopeLevels,
  scopeValueFor,
  type DraftInput,
  type PrecedentScopeLevel,
} from "@/lib/precedent";

/** The recorded shape of one `emit_precedent` tool_use input. */
interface RecordedAnswer {
  scope: { level: string; value: string };
}

const fixtures: Partial<Record<ExceptionKind, unknown>> = {
  short_payment: shortPaymentFixture,
  batched_remittance: batchedRemittanceFixture,
  late_settlement: lateSettlementFixture,
};

function isScopeLevel(value: string): value is PrecedentScopeLevel {
  return (precedentScopeLevels as readonly string[]).includes(value);
}

/** Reads the scope off a recorded answer without trusting its shape. */
function recordedScope(answer: unknown): RecordedAnswer["scope"] | null {
  if (typeof answer !== "object" || answer === null) return null;
  const scope = (answer as { scope?: unknown }).scope;
  if (typeof scope !== "object" || scope === null) return null;
  const { level, value } = scope as { level?: unknown; value?: unknown };
  if (typeof level !== "string" || typeof value !== "string") return null;
  return { level, value };
}

/**
 * Why a fixture can be turned away before it is even validated: a fixture is a
 * recording of one model answer about one counterparty. Replaying the Northwind
 * rule onto a different group would be a lie, not a fallback. So the recording
 * is used only when the exception on the desk is the case it was recorded for,
 * and everything else falls through to the deterministic draft, which is built
 * from the controller's own inputs and is always about the record in hand.
 */
function rejectionReason(input: DraftInput, recorded: unknown): string | null {
  const kind = input.exception.kind;
  if (recorded === undefined) {
    return `No recorded answer under fixtures/precedent for a ${kind} exception.`;
  }
  const scope = recordedScope(recorded);
  if (scope === null || !isScopeLevel(scope.level)) {
    return `fixtures/precedent/${kind}.json does not carry a readable scope, so it was discarded.`;
  }
  if (scopeValueFor(input.exception, scope.level) !== scope.value) {
    return `fixtures/precedent/${kind}.json was recorded for ${scope.value}, which is not the party on this record.`;
  }
  return null;
}

export async function compilePrecedentFromFixtures(input: DraftInput): Promise<CompileResult> {
  const startedAt = Date.now();
  const recorded = fixtures[input.exception.kind];
  let rejected = rejectionReason(input, recorded);

  if (rejected === null) {
    // The same validation a live tool_use block gets. Nothing skips it.
    const adopted = adoptModelRule(recorded, input);
    if (adopted) {
      return {
        rule: adopted,
        source: "fixture",
        elapsedMs: Date.now() - startedAt,
      };
    }
    rejected = `fixtures/precedent/${input.exception.kind}.json failed the precedent schema or tried to widen the controller's scope, so it was discarded.`;
  }

  return {
    rule: draftPrecedent(input),
    source: "deterministic",
    rejectedModelOutput: rejected ?? undefined,
    elapsedMs: Date.now() - startedAt,
  };
}
