# Obiter

**The controller resolves one reconciliation exception. Obiter compiles that decision into a named rule and closes every matching exception in the queue, with the precedent stamped on each record and one click to take it all back.**

> Live demo: https://obiter.vercel.app
>
> Video: `<ADD_VIDEO_URL>`

Built for **Syndicate by Maximor**, Track 2, Autonomous Office of the CFO.

## The problem

At month-end close, the easy 90 percent of reconciliation matches itself. The pain is in the residue: underpayments, currency moves between the invoice date and the settlement date, one bank transfer covering three invoices, money that lands two days after the cutoff, a fee charged twice, a payment referencing a purchase order instead of an invoice.

A controller works through those by hand. At a company of 10 to 50 people that is one person, and at an accounting firm it is the close team. The problem is not that the work is hard. It is that last month's reasoning was never written down anywhere a machine could read it, so when the same customer underpays by the same euro next month, the same line lands back in the queue and gets the same thirty seconds of thought.

The seeded close in this repo is a fair example. 220 bank lines against 210 invoices for August 2026. The matcher raised 62 exceptions. Rules written in June and July closed 38 of them before anyone opened the screen, a 61 percent autonomy rate. 24 are left, spread across six patterns.

## The solution

Obiter is two layers.

**A deterministic matching engine.** Anything it cannot clear becomes a structured exception record: pattern, counterparty and counterparty group, shortfall in amount and percent, days between due date and settlement, the evidence it collected, and the reason it escalated instead of deciding.

**A precedent compiler on top of it.** When the controller resolves one exception, the decision does not become free text and it does not become a model weight. It becomes a typed JSON rule: conditions, tolerance, scope, action, and a written reason. A language model writes that rule exactly once. From then on the rule runs in a deterministic executor, so the same queue always produces the same closures and no model call sits between a record and its outcome.

Three things follow from that shape:

1. **Retroactive application.** The rule runs against the open queue immediately. Before it does, you see exactly which exceptions it will touch, by id.
2. **Provenance.** Every closed record carries the id of the precedent that closed it.
3. **Reversal.** Reverting a precedent returns every record it ever touched to the open queue in one pass.

### The precedent object

This is the whole thing. There is no hidden state.

```json
{
  "id": "PREC-03",
  "name": "Rounding shortfall up to $2.00, Northwind Group",
  "kind": "short_payment",
  "conditions": {
    "maxAbsDelta": 2,
    "maxDeltaPct": 0.5,
    "maxDaysApart": 2,
    "currencies": ["USD"],
    "requireBatchSumMatch": false
  },
  "scope": { "level": "counterparty_group", "value": "Northwind Group" },
  "action": "close_as_rounding",
  "rationale": "This group converts EUR at their own bank and lands a euro or two short. Seen 3 times in the last 6 closes, never disputed.",
  "authoredBy": "Dana Rowe, controller",
  "compiledFrom": "EXC-0142",
  "compiledAt": "2026-08-31T18:04:11.220Z"
}
```

It is validated with Zod before it is allowed near the queue. A rule that tries to widen its own scope past what the controller chose, or change the pattern it applies to, is rejected outright rather than patched.

## Measured result on the seeded close

| | Before | After three decisions |
| --- | --- | --- |
| Open exceptions needing a human | 24 | 0 across three patterns, 11 in the remaining three |
| Records closed with no human looking at them | 38 of 62 | 51 of 62 |
| Autonomy | 61 percent | 82 percent |
| Human touches | 24 | 3 |

Clearing all six patterns takes it to 56 of 62, which is 90 percent, on six human touches. Every number on the close screen is computed from the seed at render time, not hardcoded, so you can check it by counting rows.

## How it uses the required and sponsor technology

**AO (Agent Orchestrator), the eligibility requirement.** The build ran as an orchestrator session with the work split across worker sessions: matching engine, precedent compiler, close interface, and seed pipeline. The session count and the PR summaries are on screen in the demo video, because the rules page asks for exactly that.

**Claude.** `lib/agent.ts` calls Claude with the precedent JSON schema as a tool definition, so the compiler is a structured-output call rather than prose parsing. It runs once per decision. The model id defaults to `claude-opus-5`.

**Dodo Payments, test mode.** `lib/dodo.ts` reads recent settlements and turns each into an exception the same engine reasons about. A payment that arrives while the period is still open goes through the same matcher, and if an active precedent covers it, it closes with no person involved. Without a key the same shape comes from three local fixtures.

### The compiler fallback chain

`compilePrecedent` in `lib/agent.ts` tries three paths in order:

1. Claude via the Anthropic API, when `ANTHROPIC_API_KEY` is set. **This is the path the recorded demo must run on.**
2. Your local `claude` CLI, detected once with `claude --version` and invoked with `claude -p --output-format text --model haiku`. This exists so a developer gets the real agent loop with zero keys and zero cost.
3. The deterministic draft in `lib/precedent.ts`, built from the controller's own inputs.

All three go through the same Zod schema. Output that fails it is discarded and the chain moves on, which is why a bad generation cannot reach the queue.

## Tech stack

Next.js 15 App Router, TypeScript in strict mode, Tailwind CSS v4, shadcn primitives, Zod for rule validation, Claude for the one compilation step, Dodo Payments test mode for the settlement feed, deployed on Vercel.

## Quickstart

```bash
npm install
npm run dev
```

Open http://localhost:3000 and click through to the close queue. Nothing else is required: with no environment variables the compiler falls back to your local `claude` CLI, and then to the deterministic path, and the settlement feed serves fixtures.

To run the real model path:

```bash
cp .env.example .env.local
# fill in ANTHROPIC_API_KEY, and DODO_PAYMENTS_API_KEY for the live feed
npm run dev
```

`npm run seed` is a placeholder. The close data ships in `lib/data.ts` and needs no database.

### Try the loop in 60 seconds

1. Open `/close`. 24 exceptions, autonomy at 61 percent.
2. Click **EXC-0142**, a $1.65 shortfall from Northwind Freight BV. Read what the engine collected and why it refused to decide.
3. Leave the defaults (close as rounding, tolerance $2.00, this counterparty group) and press **Compile a precedent**.
4. PREC-03 appears with its conditions and a line saying it will close 7 open exceptions, listed by id. Press **Apply**.
5. Seven rows close, each stamped PREC-03. Autonomy moves.
6. Click any PREC-03 stamp, then **Revert this precedent**. All seven return to the queue.
7. Press **Pull latest settlement**. New money arrives, matches PREC-03, and closes with no human involved.

## What we would build next

- Persist precedents in Postgres with Drizzle so they actually carry into next month instead of living in the session. The executor and the schema are already the storage contract.
- Signed Dodo webhooks with `standardwebhooks` so settlements push instead of being pulled.
- A precedent conflict check: warn when a new rule overlaps an existing one, and show which one wins.
- Per-precedent hit rate over time, so a rule that starts closing things it should not is visible before an auditor finds it.
- Export the precedent set as a reviewable diff for the auditor, which is the artifact an accounting firm would actually want.

## AI use

We used AI coding assistants for scaffolding and boilerplate. Architecture, product decisions, and final code review are our own. The product itself calls Claude at one point in its runtime, documented above under the compiler fallback chain. Adjust this section to match the disclosure rules of whichever event this is submitted to.

## Team

`<ADD_TEAM_MEMBER_NAMES>`
