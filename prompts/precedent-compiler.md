# The precedent compiler prompt

This is documentation of the prompt `buildPrompt` assembles at runtime in
`lib/agent.ts`. It is written out here so the prompt can be reviewed, diffed and
argued about without reading TypeScript string concatenation.

**It is not read from disk.** `lib/agent.ts` builds the string itself and must
keep doing so: a Vercel route may not depend on a file that is not in the
serverless bundle. If you change the prompt in `lib/agent.ts`, change it here in
the same commit.

## How the model is called

One request to `POST https://api.anthropic.com/v1/messages`, once per controller
decision, with:

- `model`: `process.env.ANTHROPIC_MODEL`, defaulting to `claude-opus-5`.
- `max_tokens`: 1024.
- `tools`: a single tool named `emit_precedent`, described as "Emit the compiled
  precedent rule for this controller decision." Its `input_schema` is
  `precedentJsonSchema`, exported from `lib/precedent.ts` and kept in step with
  the Zod schema in the same file.
- `tool_choice`: `{ type: "tool", name: "emit_precedent" }`, so the model has no
  prose path out.
- `messages`: one user turn carrying the text below.

The answer is read from the `tool_use` block named `emit_precedent`. Its `input`
goes straight into `adoptModelRule`, which overwrites `id`, `authoredBy`,
`compiledFrom` and `compiledAt` with values the model is not allowed to choose,
then validates. Anything that fails is discarded, not patched.

## The user turn

Placeholders are written as `{{like_this}}`. Every one of them is filled from the
`DraftInput` the route builds.

```
You are the precedent compiler inside a month-end close tool.
A controller has just resolved one reconciliation exception by hand.
Write the reusable matching rule that decision implies. Write it once, narrow.

THE EXCEPTION THE CONTROLLER RESOLVED
id: {{exception.id}}
pattern: {{exceptionKindLabels[exception.kind]}}
counterparty: {{exception.counterparty}} (group: {{exception.counterpartyGroup}})
invoice {{exception.invoiceNumber}}: {{money(exception.invoiceAmount)}}
received: {{money(exception.receivedAmount)}}
shortfall: {{money(shortfall(exception))}} ({{shortfallPct(exception) to 3dp}} percent)
days between due date and settlement: {{exception.daysApart}}
times this counterparty produced the same pattern in the last six closes: {{exception.priorOccurrences}}
evidence the engine collected:
  - {{each line of exception.evidence}}

THE CONTROLLER'S DECISION
action: {{precedentActionLabels[decision.action]}}
tolerance they set: {{money(decision.toleranceAmount)}}
scope they chose: {{precedentScopeLabels[decision.scopeLevel]}}
their note: {{decision.rationale or "(none written)"}}

OTHER OPEN EXCEPTIONS WITH THE SAME PATTERN
  {{each other open exception of the same kind: id, counterparty, group,
    shortfall in money, shortfall percent to 3dp, days late}}
  {{or "(none)" when there are no others}}

RULES YOU MUST FOLLOW
1. scope.level must be exactly "{{decision.scopeLevel}}". Never widen it.
2. kind must be exactly "{{exception.kind}}".
3. Tolerances must be tight enough that a record the controller would want to see never closes silently.
4. requireBatchSumMatch is true only for a batched remittance being split.
5. The rationale is for an auditor reading this in six months. Two sentences at most.

Call the emit_precedent tool with the rule. Do not reply with prose.
```

## What the tool call must contain

`emit_precedent` takes exactly these keys and no others. The model never sets
`id`, `authoredBy`, `compiledFrom` or `compiledAt`.

| Key | Type | Bound enforced after the call |
| --- | --- | --- |
| `name` | string | 8 to 90 characters |
| `kind` | enum | one of the six exception kinds, and equal to the resolved exception's kind |
| `conditions.maxAbsDelta` | number | 0 to 250000 |
| `conditions.maxDeltaPct` | number | 0 to 100 |
| `conditions.maxDaysApart` | integer | 0 to 30 |
| `conditions.currencies` | string array | 1 to 6 entries, each 3 characters |
| `conditions.requireBatchSumMatch` | boolean | true only for a batch split |
| `scope.level` | enum | equal to the level the controller chose |
| `scope.value` | string | 1 to 80 characters |
| `action` | enum | one of the seven precedent actions |
| `rationale` | string | 12 to 400 characters |

Rules 1 and 2 are not requests. `adoptModelRule` rejects a rule whose
`scope.level` differs from the controller's choice or whose `kind` differs from
the exception's, and the caller falls back to the deterministic draft. A model
that argues its way to a wider scope still closes nothing.

## The fallback chain, and where the offline path fits

`ADAPTER_MODE=real` runs `compilePrecedent` in `lib/agent.ts`: the Anthropic API,
then the developer's local `claude` CLI, then `draftPrecedent`. `ADAPTER_MODE`
unset or `fake` runs `lib/fake-compiler.ts`, which replays a recorded answer from
`fixtures/precedent/` through the same `adoptModelRule`. Each fixture file is
shaped exactly like the `input` of the `emit_precedent` tool_use block above, so
a fixture that would have been rejected coming off the wire is rejected coming
off disk too.
