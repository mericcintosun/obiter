// What these tests are for.
//
// The demo has one number in it that a judge can check on camera: PREC-03,
// compiled from EXC-0142 at a $2.00 tolerance, closes exactly seven exceptions,
// and the ids are read out loud. If that list ever changes by one row the
// recording is wrong, so it is pinned here byte for byte rather than trusted.
//
// The rest is the guard rail. A compiled rule may not widen the controller's
// scope and may not reach past the tolerance they stated, and both of those are
// checked against every pattern in the seed rather than against the one the demo
// happens to use.
//
// Everything here runs offline through lib/fake-compiler.ts, which is the same
// adoptModelRule path a live model answer takes.

import { describe, expect, it } from "vitest";
import { openExceptions, type ReconException } from "@/lib/data";
import { compilePrecedentFromFixtures } from "@/lib/fake-compiler";
import {
  adoptModelRule,
  precedentRuleSchema,
  previewPrecedent,
  scopeValueFor,
  type ControllerDecision,
  type DraftInput,
  type PrecedentAction,
  type PrecedentScopeLevel,
} from "@/lib/precedent";

const COMPILED_AT = "2026-08-31T18:04:11.220Z";
const DECIDED_BY = "Dana Rowe, controller";

function exceptionById(id: string): ReconException {
  const found = openExceptions.find((exception) => exception.id === id);
  if (!found) throw new Error(`the seed no longer carries ${id}`);
  return found;
}

function draftInput(
  exceptionId: string,
  action: PrecedentAction,
  scopeLevel: PrecedentScopeLevel,
  toleranceAmount: number
): DraftInput {
  const exception = exceptionById(exceptionId);
  const decision: ControllerDecision = {
    exceptionId,
    action,
    toleranceAmount,
    scopeLevel,
    rationale: "",
    decidedBy: DECIDED_BY,
  };
  return {
    exception,
    decision,
    queue: openExceptions,
    nextId: "PREC-03",
    compiledAt: COMPILED_AT,
  };
}

// One fixed input per pattern the seed carries, with the action, the scope and
// the tolerance the close screen offers as its defaults for that pattern.
const CASES: Array<{ label: string; input: DraftInput; isBatch: boolean }> = [
  {
    label: "short payment, Northwind Group at $2.00",
    input: draftInput("EXC-0142", "close_as_rounding", "counterparty_group", 2),
    isBatch: false,
  },
  {
    label: "batched remittance, Kestrel Media Ltd",
    input: draftInput("EXC-0145", "split_match", "counterparty", 10800),
    isBatch: true,
  },
  {
    label: "late settlement, all counterparties at $0.00",
    input: draftInput("EXC-0148", "close_as_timing", "all_counterparties", 0),
    isBatch: false,
  },
  {
    label: "duplicate fee, Vantage Payments",
    input: draftInput("EXC-0150", "reverse_duplicate", "counterparty", 184.5),
    isBatch: false,
  },
  {
    label: "reference mismatch, Solano Ceramics SL at $0.00",
    input: draftInput("EXC-0153", "match_on_reference", "counterparty", 0),
    isBatch: false,
  },
];

describe("the compiler, over every pattern in the seed", () => {
  for (const { label, input, isBatch } of CASES) {
    it(`writes a schema-valid rule for ${label}`, async () => {
      const result = await compilePrecedentFromFixtures(input);
      expect(precedentRuleSchema.safeParse(result.rule).success).toBe(true);
    });

    it(`never widens the controller's scope for ${label}`, async () => {
      const result = await compilePrecedentFromFixtures(input);
      expect(result.rule.scope.level).toBe(input.decision.scopeLevel);
      expect(result.rule.scope.value).toBe(
        scopeValueFor(input.exception, input.decision.scopeLevel)
      );
      expect(result.rule.kind).toBe(input.exception.kind);
    });

    if (!isBatch) {
      it(`stays inside the stated tolerance for ${label}`, async () => {
        const result = await compilePrecedentFromFixtures(input);
        expect(result.rule.conditions.maxAbsDelta).toBeLessThanOrEqual(
          input.decision.toleranceAmount + 1e-9
        );
      });
    }
  }
});

describe("adoptModelRule turns away output it should not trust", () => {
  const input = draftInput("EXC-0142", "close_as_rounding", "counterparty_group", 2);

  const honest = {
    name: "Rounding shortfall up to $2.00, Northwind Group",
    kind: "short_payment",
    conditions: {
      maxAbsDelta: 2,
      maxDeltaPct: 0.5,
      maxDaysApart: 2,
      currencies: ["USD"],
      requireBatchSumMatch: false,
    },
    scope: { level: "counterparty_group", value: "Northwind Group" },
    action: "close_as_rounding",
    rationale: "This group converts EUR at their own bank and lands a euro or two short.",
  };

  it("adopts the rule the controller actually asked for", () => {
    expect(adoptModelRule(honest, input)).not.toBeNull();
  });

  it("rejects a rule that widens the scope past what the controller chose", () => {
    const widened = {
      ...honest,
      scope: { level: "all_counterparties", value: "All counterparties" },
    };
    expect(adoptModelRule(widened, input)).toBeNull();
  });

  it("rejects a rule that reaches past the stated tolerance", () => {
    const widened = { ...honest, conditions: { ...honest.conditions, maxAbsDelta: 50 } };
    expect(adoptModelRule(widened, input)).toBeNull();
  });
});

describe("the demo invariant", () => {
  // These seven ids are read out loud in the recording. If this test fails, the
  // video is wrong, not the test.
  const SEVEN = [
    "EXC-0142",
    "EXC-0144",
    "EXC-0149",
    "EXC-0151",
    "EXC-0158",
    "EXC-0163",
    "EXC-0166",
  ];

  it("compiles PREC-03 from EXC-0142 and closes exactly those seven", async () => {
    const input = draftInput("EXC-0142", "close_as_rounding", "counterparty_group", 2);
    const result = await compilePrecedentFromFixtures(input);

    expect(result.rule.id).toBe("PREC-03");
    expect(result.source).toBe("fixture");
    expect(result.rule.conditions.maxAbsDelta).toBe(2);
    expect(previewPrecedent(result.rule, openExceptions)).toEqual(SEVEN);
  });

  it("previews the same seven on a second call", async () => {
    const input = draftInput("EXC-0142", "close_as_rounding", "counterparty_group", 2);
    const first = await compilePrecedentFromFixtures(input);
    const second = await compilePrecedentFromFixtures(input);

    expect(previewPrecedent(first.rule, openExceptions)).toEqual(SEVEN);
    expect(previewPrecedent(second.rule, openExceptions)).toEqual(SEVEN);
    expect(second.rule).toEqual(first.rule);
  });
});
