# Obiter, handoff

Paste this whole file into a fresh coding agent session opened at the repo root. It is everything you need to start working.

---

## 1. Context

**Product:** Obiter.

**One-liner:** The controller resolves one reconciliation exception, that decision becomes a named rule, and the rule closes every matching exception in the queue immediately.

**Plain pitch:** At month-end close, bank activity and invoices never agree, and hundreds of lines are left for someone to look at by hand. Obiter matches what it can and puts the rest in one list. You resolve a line: this customer always underpays by under two dollars because of an exchange rate, close it. Obiter turns that decision into a rule with a name, and closes the other lines with the same shape right in front of you. Under every closed line it says which rule closed it, and if you do not like the rule, one click takes back everything it touched.

**Hackathon:** Syndicate by Maximor (Devpost, online). https://syndicate-by-maximor.devpost.com/

**Deadline:** Sunday 6 September 2026. The rules page says 6:00 PM EDT; the registry record says 23:59 UTC. Treat 18:00 EDT as binding, it is the earlier of the two. Resubmission after the fact appears not to be allowed, so verify on the form before you submit.

**Target track:** Track 2, Autonomous Office of the CFO, first place, $1,000 cash. The same submission also rides the Dodo Payments credit rows for first and second place in Track 2. A project may enter only ONE track, so do not touch Track 1.

**Judging weights, verbatim from the rules page:**

| Criterion | Weight |
| --- | --- |
| AO Usage & Build Process | 25% |
| Technical Execution & Reliability | 25% |
| Track Fit & Real-World Value | 25% |
| Demo & Usability | 15% |
| Innovation | 10% |

**Verified submission requirements:**

1. Pick one of the two tracks. We are Track 2.
2. Explain the problem and the target user.
3. Ship a working project built during the event.
4. GitHub repo with code and setup instructions.
5. Demo video, 3 to 5 minutes, showing the product working. 300 seconds is the safe ceiling.
6. Describe the agent architecture, the tools, the workflows, and how you evaluated it.
7. Show a measurable result or user validation.
8. List every team member by name.
9. **Use the AO platform meaningfully throughout, and prove AO sessions are visible in the demo.** This is eliminatory. The rules page says AO usage is mandatory for eligibility and is verified through the submission and the demo. If AO sessions are not on screen, all ten prize rows fall.
10. One Devpost project per team.

**Code freshness is auditable.** All work must start after the official start time and organisers may inspect the repo and commit history. Keep commits granular and honest.

**Open questions nobody resolved:** team size cap is not stated anywhere; the eligibility text on the landing page (student restriction, no company entries) contradicts the rules page (open worldwide); whether the Dodo credit rows require a Dodo integration was inferred from the prize card only. Check these on the form before submitting.

---

## 2. Current state

This repo is a working scaffold, not an empty template. `npm install && npm run dev` gives you the landing page and a live close queue with the full precedent loop.

**Identity: see IDENTITY.md (direction D1, archetype L3).** Every color comes from that file through `app/globals.css`. No component carries a hex. The radius is sharp, the motion signature is a clip-path wipe prefixed `obiter-`, and the header is solid ground with a bottom border, never translucent.

**One mark proof.** `app/layout.tsx` renders exactly one brand image, inside the home link, and no other brand image anywhere:

```tsx
<Link href="/" className="flex items-center gap-2.5">
  <Image
    src="/brand/logo.png"
    alt=""
    width={26}
    height={26}
    priority
    className="h-[26px] w-[26px] object-contain"
  />
  <span className="font-display text-lg tracking-tight">Obiter</span>
</Link>
```

**File map**

| File | What it does |
| --- | --- |
| `IDENTITY.md` | The design contract. Append-only. Add dated lines under Amendments, never edit the key block. |
| `app/globals.css` | The nine identity hexes, the shadcn token mapping, the `obiter-wipe` and `obiter-stamp` keyframes, the reduced-motion block. |
| `app/layout.tsx` | Fonts (Newsreader display, Archivo body, IBM Plex Mono for the rule JSON only), metadata, header, footer. |
| `app/page.tsx` | The landing page. Single column editorial, one CTA mid-flow into `/close`. |
| `app/close/page.tsx` | Server component. Feeds the seed into the client queue. |
| `components/close-queue.tsx` | **The product.** Queue, evidence panel, decision form, compile, preview, apply, seal stamps, precedent inspector, revert, settlement pull, reset. All client state. |
| `lib/data.ts` | The August 2026 close for Halden Analytics: 24 open exceptions across six patterns, two carried precedents, the close summary, money and date formatters. |
| `lib/precedent.ts` | The Zod rule schema, the JSON Schema handed to the model, the deterministic executor (`matchesPrecedent`, `previewPrecedent`), the deterministic draft (`draftPrecedent`), and `adoptModelRule` which validates model output and rejects scope widening. |
| `DEMO.md` | The cross-phase demo contract. Six numbered steps, the routes they are allowed to use, the numbers on screen. Phase 9 derives the shot list from it. |
| `CLAUDE.md` | Commands, stack pitfalls, the five Vercel guardrails, folders never to touch. |
| `lib/types.ts` | The shared vocabulary: `ApiError`, `CompilePrecedentResponse`, `SettlementResponse`, `CloseState`, plus re-exports of the domain types. Handlers and the client both import from here. |
| `lib/adapters.ts` | The seam. `adapterMode()`, `getCloseState()`, `compilePrecedentViaAdapter()`, `getLatestSettlement()`. Every page and route goes through it. Phase 2 puts Postgres behind `getCloseState`. |
| `lib/fake-compiler.ts` | The offline compiler. Replays `fixtures/precedent/*.json` through `adoptModelRule`, falls to `draftPrecedent` when nothing matches. |
| `fixtures/precedent/*.json` | Three recorded `emit_precedent` answers, shaped exactly like the model tool_use input. `short_payment.json` is the PREC-03 of the demo. |
| `prompts/precedent-compiler.md` | The runtime prompt written out for review. Documentation only; `lib/agent.ts` does not read it. |
| `scripts/seed.mjs` | `npm run seed`. Writes `fixtures/close-august-2026.json` deterministically and prints the counts. |
| `lib/agent.ts` | The compiler chain: Anthropic API, then local `claude` CLI, then deterministic. This is the only place a model runs. Reached only when `ADAPTER_MODE=real`. |
| `lib/dodo.ts` | The settlement feed. Real Dodo REST call when `DODO_PAYMENTS_API_KEY` is set, three fixtures otherwise. |
| `app/api/precedent/route.ts` | POST. Compiles a decision into a rule and returns the rule plus the exact ids it would close. |
| `app/api/settlements/route.ts` | GET. Pulls one settlement and returns it as an exception. |
| `components/ui/*` | shadcn primitives. `badge.tsx` gained `seal`, `closed`, and `pending` variants and square corners. |
| `lib/config.ts` | The only file under `lib/`, `app/` or `components/` that reads `process.env`, plus every named constant on the core path. |
| `lib/errors.ts` | The `ErrorCode` union and the `{ error, hint }` body every handler answers a failure with. |
| `lib/schemas.ts` | The zod schemas every route parses its input with before it does anything else. |
| `lib/store.ts` | The close ledger. One `CloseStore` interface, `memoryStore` (the default) and `postgresStore`, picked by `closeStore()`. |
| `lib/db/schema.ts`, `lib/db/client.ts` | The three drizzle tables and the lazily created Neon connection. Server only. |
| `lib/cache.ts` | In-process cache of compile results, so two takes of the demo render identically. |
| `drizzle/0000_init.sql` | The three tables as plain SQL. `npm run db:push` applies it; `lib/db/schema.ts` mirrors it by hand. |
| `app/api/close/journal/route.ts` | POST. The one write endpoint for the close ledger. Never appears on camera. |
| `tests/*` | Vitest. `precedent.test.ts` pins the seven id PREC-03 preview; `schemas.test.ts` pins the edge rejections. |
| `app/loading.tsx`, `app/close/loading.tsx` | `HomeSkeleton` and `CloseQueueSkeleton`. The two demo routes' loading branches, each holding its own page's rhythm. |
| `scripts/demo-reset.mjs` | `npm run demo:reset`. Clears the journal for `OBITER_CLOSE_ID` and prints the state DEMO.md step 1 opens on. Works without a database too. |

**Real vs mocked**

- Real: the matching executor, the rule schema and its validation, retroactive application, provenance stamping, revert, the autonomy arithmetic (computed from the seed at render time, nothing hardcoded), the Anthropic API call in `compileWithAnthropic`, and, as of Phase 2, the close journal in Postgres behind `getCloseState()`.
- Mocked or fallback: as of Phase 1 the compiler is chosen by `ADAPTER_MODE`, which defaults to `fake` and replays `fixtures/precedent/` through `lib/fake-compiler.ts`. `ADAPTER_MODE=real` runs the live chain in `lib/agent.ts` (Anthropic API, then the local `claude` CLI, then `draftPrecedent`). `fetchLatestSettlement` in `lib/dodo.ts` returns fixtures when no Dodo key is set, and the fixture list is what the demo currently runs on. Phase 2 closed the database gap: precedents, closures and pulled settlements are written to Neon under `ADAPTER_MODE=real` and to an in-process journal otherwise, so a reload no longer wipes the close. None of it has been run against a real database yet.

---

## 3. Mission, in priority order

The wow moment is item 3 and it has to be finished and recordable before anything below it is touched.

**A. Persist the state. 2 hours.**
Right now a reload wipes every precedent, which undercuts the whole pitch (a precedent is supposed to outlive the close it was written in). Add Postgres on Neon with Drizzle: tables for `exceptions`, `precedents`, and `closures` (exception id, precedent id, whether a human decided it, timestamp). Move `lib/data.ts` into a real `npm run seed` that is idempotent. Done looks like: write a precedent, reload the page, it is still there and its records are still closed, and `npm run seed` resets everything to the August 2026 baseline in one command.

**B. Harden the compiler path. 1 hour.**
Run the loop end to end with a real `ANTHROPIC_API_KEY` at least ten times across all six patterns and check what comes back. Look specifically for rules that are wider than the controller asked for. `adoptModelRule` already rejects a scope level that does not match, but tolerances are not bounded yet. Add an upper bound: a compiled `maxAbsDelta` may not exceed the controller's stated tolerance. Done looks like: ten runs, zero rules that close a record you would not have closed yourself, and the rejection path exercised at least once on purpose.

**C. The wow moment, rehearsed. 1 hour. Schedule this before anything below.**
The 90-second flow is already implemented. Your job is to make it never stumble on camera: open `/close`, 24 exceptions and 61 percent; open EXC-0142 and read the evidence out loud; compile; PREC-03 appears with its conditions and the line saying it will close 7; apply; seven rows close with the seal stamped on each and the meter moves; click a seal, show the seven records, revert, show them come back, apply again; pull a settlement and watch it close under PREC-03 with no human involved. Done looks like: three clean takes in a row with a real API key and no reset needed between them.

**D. Measurement table on screen. 1 hour.**
Requirement 7 asks for a measurable result and the judges weight reliability at 25 percent. Add a small results view (or a section on the landing page) fed by the same state: exceptions raised, closed without a human, autonomy before and after, human touches, and median time from opening an exception to closing its whole pattern. Numbers must come from the running app, not from a slide. Done looks like: a judge can watch the number change during the demo and then read the same number in the README.

**E. Dodo webhook instead of polling. 1.5 hours. First thing to cut.**
Add `app/api/webhooks/dodo/route.ts` with `standardwebhooks` signature verification, and a Dodo test-mode checkout link so you can trigger a real payment on camera. The polling button already covers the demo, so this only buys you a stronger sponsor story. Cut it if time is short.

**F. Neatlogs tracing. 45 minutes. Second thing to cut.**
`neatlogs.init` around the compiler call, so there is a trace screen to show. Nice for the architecture section of the video. Cut before touching anything above.

**Cut order if the deadline squeezes: F, then E, then D. Never C.**

**AO, and this is not optional.** Do the remaining work as AO worker sessions off one orchestrator session, and screen record the AO dashboard with the total session count while you build. Do not stage it afterwards. Requirement 9 is eliminatory and the rules page says it is verified through both the submission and the demo.

---

## 4. Constraints

**Stack.** Next.js 15 App Router, TypeScript strict, Tailwind v4 (no `tailwind.config.js`, no `@tailwind` directives, tokens live in `@theme` in `app/globals.css`), shadcn primitives from `components/ui`. Deploys to Vercel: no custom server, no writes to the filesystem at runtime, no long-lived processes. Any component with `useState`, `useEffect`, or an event handler starts with `"use client"`. Route `params` and `searchParams` are Promises in Next 15 and must be awaited.

**Design.** Read `IDENTITY.md` before you touch a component. Colors come from the tokens, never as raw hex. Corners stay sharp. The mono font is for the rule JSON block and nothing else. The header keeps exactly one brand image. If you need a UI primitive the repo lacks, write it into `components/ui` in the same shadcn form rather than styling something inline.

**Copy.** No em dashes, no en dashes, no double hyphens standing in for a dash. Use a comma, a period, a colon, or parentheses. Banned vocabulary: seamless, leverage, empower, revolutionize, streamline, game-changer, cutting-edge, delve, robust, unlock, elevate, harness, effortless, "in today's world", "it's not just X, it's Y". Vary sentence length. Use concrete numbers. Write like a controller talking to another controller.

**Scope.** If something threatens the deadline, cut scope, do not polish. A working narrow demo beats a broad broken one, and the judging weights say so out loud. Keep `npm run build` passing after every change; do not stack three features and then find out.

**Honesty.** Every number the UI shows must be computed from real state. If you fake a figure for the video and a judge asks where it comes from, the reliability score goes with it.

---

## 5. Definition of done

- [ ] Deployed on Vercel and reachable at the URL in the README.
- [ ] `README.md` demo links filled in: live URL and the 3 to 5 minute video.
- [ ] Team member names filled in, in the README and on the Devpost form.
- [ ] The 90-second flow in section 3C runs end to end on seed data, with a real `ANTHROPIC_API_KEY`, three clean takes in a row.
- [ ] Precedents survive a page reload.
- [ ] The AO dashboard with the total session count is visible in the video, recorded during the build and not staged after.
- [ ] The measurement table in the README matches what the running app shows.
- [ ] Devpost form submitted with Track 2 selected, repo link, and deploy link, before 18:00 EDT on 6 September 2026.

---

## 6. Phase log

### Phase 1, 6 September 2026: demo contract, adapter seam, offline compiler

**Goal.** Write the cross-phase contract files, put a typed seam between the app
and its data and model calls, and close the one reliability hole in the demo:
the compile step used to need a network key or a local `claude` binary and
silently changed code path when neither was there.

**Status.** All five slices done. Nothing was cut. Not verified by me: nothing in
this phase was executed, because the session had file tools only. `npm install`,
`npm run build`, `npm run seed` and the browser are all unrun.

**Decisions.**

1. **`ADAPTER_MODE` defaults to `fake`, and anything that is not exactly the
   string `"real"` is fake.** Absence of a key is not a mode. Before this, the
   compiler picked a path from whatever happened to be installed on the machine,
   which is the one thing a recorded demo cannot afford. Fake means the whole
   `/close` flow is clickable with no accounts and no network; `real` runs the
   live Claude chain unchanged.
2. **The fake compiler goes through `adoptModelRule`, not around it.** A fixture
   is treated as a recorded `emit_precedent` tool_use input and gets the same Zod
   parse and the same scope-widening rejection a live answer gets. A fixture that
   would have been thrown out coming off the wire is thrown out coming off disk,
   so the offline path proves the guard rail rather than bypassing it. When a
   fixture is rejected, the caller falls to `draftPrecedent` and the rejection
   reason is shown on the proposal card in `rejectedModelOutput`.
3. **A fixture is only used for the case it was recorded for.** Each fixture
   carries a `scope`, and `lib/fake-compiler.ts` checks that
   `scopeValueFor(exception, level)` equals the recorded value before adopting
   it. Replaying the Northwind rule onto a different group would be a lie, not a
   fallback. This is a selection check, not a mutation: the fixture files are
   never edited at runtime.
4. **`lib/agent.ts` is imported lazily inside `compilePrecedentViaAdapter`.** It
   pulls in `node:child_process`, and in fake mode nothing should drag that into
   a module graph that `app/close/page.tsx` also sits in.
5. **`CompilerSource` gained `"fixture"`.** It is a fourth compiler in the chain,
   not a bypass, so it is named in the same union and labelled on screen as "the
   checked-in fixture compiler".
6. **The adapter mode is recorded on the exception, not on the settlement.**
   `IncomingSettlement` is the shape Dodo hands us and it does not know this app
   has modes, so `app/api/settlements/route.ts` appends one evidence line
   reading `Adapter mode: fake` instead. `SettlementResponse` keeps its two keys.
7. **`.farm-commits.json` lists the fixture compiler before the adapter seam.**
   `lib/adapters.ts` imports `lib/fake-compiler.ts`, so committing the seam first
   would leave one commit with an unresolvable import. Every commit in the plan
   leaves a tree that resolves.
8. **`components/close-queue.tsx` rides in the last commit.** It carries both the
   typing change from slice 2 and the mobile row change from slice 5, and git
   commits whole files, so it is listed once, in the slice whose change is more
   visible.

**Failed attempts.** None. No error resisted two corrections, because nothing was
executed. Read that as "untested", not as "clean".

**Files changed.**

Created: `DEMO.md`, `CLAUDE.md`, `lib/types.ts`, `lib/adapters.ts`,
`lib/fake-compiler.ts`, `fixtures/precedent/short_payment.json`,
`fixtures/precedent/batched_remittance.json`,
`fixtures/precedent/late_settlement.json`, `prompts/precedent-compiler.md`,
`scripts/seed.mjs`, `components/site-nav.tsx`, `app/close/loading.tsx`,
`.farm-commits.json`.

Edited: `lib/agent.ts` (the `CompilerSource` union only, the chain is untouched),
`app/close/page.tsx`, `app/api/precedent/route.ts`,
`app/api/settlements/route.ts`, `app/layout.tsx`, `app/error.tsx`,
`app/not-found.tsx`, `components/close-queue.tsx`, `package.json`,
`.env.example`, `README.md`, `HANDOFF.md`.

Untouched on purpose: `IDENTITY.md`, `lib/data.ts`, `lib/precedent.ts`,
`lib/dodo.ts`, `app/page.tsx`, `app/globals.css`, `components/ui/*`,
`public/brand/*`.

**Commands run.** None, this phase was file edits only.

**Open questions.**

1. `app/page.tsx` still imports `openExceptions` and `closeSummary` straight from
   `@/lib/data` rather than through `getCloseState()`. The acceptance gate only
   named the close screen and landing page work was out of scope, so it was left
   alone. When Phase 2 puts Postgres behind the seam, the landing page numbers
   will drift from the close screen numbers unless it is rewired too. It is a
   three line change: make `Home` async and read the same state.
2. `adoptModelRule` still does not bound a compiled `maxAbsDelta` by the
   tolerance the controller stated. HANDOFF section 3B calls for that and this
   phase did not add it, because the brief forbade refactoring the executor. The
   `late_settlement` fixture is the case that shows the gap: it carries a
   `maxAbsDelta` of 0.02 while the controller's default tolerance for those rows
   computes to 0.00.
3. The reset button, the settlement sequence and every precedent still live in
   React state. Nothing in this phase changed that.

**Next best step.** Phase 2: Postgres and Drizzle behind `getCloseState()`, so
precedents survive a reload. Section 3A above already calls this the biggest gap.
The seam is now the only thing to change: `getCloseState()` in `lib/adapters.ts`
returns `CloseState`, `app/close/page.tsx` awaits it and knows nothing else, and
`scripts/seed.mjs` already produces the deterministic snapshot the tables should
be loaded from. Record the first Vercel URL in this section when it lands; the
deploy step rewrites README's `> Live demo:` line but does not touch this file.

---

### Phase 2, 6 September 2026: precedents that survive a reload

**Goal.** Put durable close state behind `getCloseState()` so DEMO.md steps 4, 5
and 6 survive a browser refresh, and put a boundary around everything the app
talks to: one env door, one error vocabulary, a zod parse at every route edge, a
bounded compiler call, and a test that pins the demo's seven ids.

**Status.** All five slices done. Nothing was cut. **Not verified by me: nothing
in this phase was executed, because the session had file tools only.**
`npm install`, `npm run build`, `npm test`, `npm run db:push`, `npm run db:seed`
and the browser are all unrun. Read every claim below as "written", not "proven".

**What went real.** The close journal. `lib/store.ts` is one `CloseStore`
interface with two implementations: `memoryStore`, a module scope journal that is
the default and survives navigation inside one server process, and
`postgresStore`, drizzle over three tables in Neon scoped by `CLOSE_ID`.
`getCloseState()` composes the August 2026 seed with whichever one answers and
never throws: a failed read logs once and returns the seed with an empty journal.
`components/close-queue.tsx` hydrates from that journal on mount and writes back
to `app/api/close/journal/route.ts` after apply, revert, settlement and reset.

**What still returns fixtures.**

- `fetchLatestSettlement` in `lib/dodo.ts` serves the three local settlements
  whenever `DODO_PAYMENTS_API_KEY` is empty. The demo currently runs on those.
- The three files under `fixtures/precedent/` are the compiler in fake mode.
  `short_payment.json` is the PREC-03 of the demo, `batched_remittance.json`
  covers Kestrel, and `late_settlement.json` is deliberately rejected by the new
  tolerance bound, which is the guard rail proving itself.
- `lib/data.ts` is still the only source of the 24 open exceptions, the 62
  raised, the 38 carried closures and the six patterns. The database holds the
  journal on top of the seed, never the seed itself.

**Env keys the runner must fill.** `DATABASE_URL` (Neon, pooled connection
string, `?sslmode=require`), `OBITER_CLOSE_ID` (any label, defaults to
`halden-2026-08`), `ADAPTER_MODE=real`, `ANTHROPIC_API_KEY`. Optional:
`DODO_PAYMENTS_API_KEY` for a live settlement feed. All eight keys the app reads
are listed in `.env.example` with a one line comment naming the source.

**Decisions.**

1. **`memoryStore` is the default, not a null object.** In fake mode the journal
   lives in module scope, so a laptop with no database still keeps a precedent
   across a navigation inside one `npm run dev` process. It resets when the
   process does, and README says so plainly. The alternative, making fake mode
   stateless, would have meant the persistence work was invisible without a Neon
   account, and the demo has to be clickable with no accounts.
2. **`postgresStore` runs only under `ADAPTER_MODE=real`.** `closeStore()` picks
   on the mode first and on the client second, so a stray `DATABASE_URL` in a
   developer's shell cannot silently change what the fake path does.
3. **The seed is never written to the database.** `npm run db:seed` clears the
   journal rather than inserting 24 rows. `lib/data.ts` is the baseline every
   close starts from, so "reset the close" is a delete, which is idempotent by
   construction and cannot drift from the file the tests read.
4. **A reverted precedent is marked, not deleted.** `status` goes to
   `'reverted'` and its closures are removed. An auditor should be able to see
   that a rule was written and taken back; `readJournal` filters on
   `status = 'active'` so the screen does not.
5. **The client writes after it renders, and never waits.** `persist` is fire and
   forget. The controller's click is the decision and the screen has already
   acted on it; if the ledger refuses, the audit trail gains one sentence saying
   the screen is ahead of the record. Blocking the queue on a database round trip
   would have put a spinner into the wow moment.
6. **The apply entry carries `source` and `elapsedMs`.** The brief named three
   fields for the apply op. Two more are optional in `journalRequestSchema`,
   because the `precedents` table records which compiler wrote each rule and how
   long it took, and inventing `"unknown"` for a value the client already has
   would have made the audit column a lie.
7. **`lib/types.ts` holds the journal and request types, `lib/store.ts`
   re-exports them.** The client needs `ClosureRow` and `JournalRequest`, and
   `lib/types.ts` is the one file that is safe for a `"use client"` component to
   import: every import in it is `import type`, so it erases and no database
   driver reaches a browser bundle.
8. **`app/close/page.tsx` and `app/page.tsx` are `force-dynamic`.** Both now read
   the journal. Without it the close would be captured at build time and a reload
   would show whatever the build machine saw.
9. **The compile cache is keyed on everything except `compiledAt`.** That is the
   only field that moves between two identical decisions, and pinning it is the
   point: two takes of the demo render the same rule, the same rationale and the
   same elapsed milliseconds.
10. **The tolerance bound is `<=` with an epsilon, and skips the batch case.**
    `fixtures/precedent/short_payment.json` carries `maxAbsDelta: 2` and the
    controller's default tolerance for EXC-0142 computes to exactly 2.00, so a
    strict `<` would have rejected PREC-03 and compiled the deterministic draft
    instead. A batched remittance does not close on a delta at all, so its
    placeholder `maxAbsDelta` is exempt.
11. **`lib/cache.ts` and `package.json` ride in the store commit.**
    `lib/adapters.ts` imports the cache and `lib/store.ts` imports `drizzle-orm`,
    so committing them in the hardening slice would have left three commits whose
    imports do not resolve. `.farm-commits.json` is ordered for import
    resolution, not for slice order. Note that the intermediate commits are not
    each independently type-clean: the `ApiError` shape changes in commit 2 and
    the handlers that produce it land in commit 3.

**Failed attempts.** None. No error resisted two corrections, because nothing was
executed. Read that as "untested", not as "clean".

**Files changed.**

Created: `lib/config.ts`, `lib/errors.ts`, `lib/schemas.ts`, `lib/cache.ts`,
`lib/store.ts`, `lib/db/schema.ts`, `lib/db/client.ts`, `drizzle/0000_init.sql`,
`scripts/db-push.mjs`, `scripts/db-seed.mjs`,
`app/api/close/journal/route.ts`, `vitest.config.ts`, `tests/precedent.test.ts`,
`tests/schemas.test.ts`, `.farm-commits.json`.

Edited: `lib/types.ts`, `lib/adapters.ts`, `lib/agent.ts`, `lib/dodo.ts`,
`lib/precedent.ts` (the tolerance bound in `adoptModelRule` only, the executor is
untouched), `app/api/precedent/route.ts`, `app/api/settlements/route.ts`,
`app/close/page.tsx`, `app/page.tsx`, `components/close-queue.tsx`,
`next.config.ts` (`serverExternalPackages: ["postgres"]`), `package.json`,
`.env.example`, `CLAUDE.md`, `DEMO.md` (one row added to the route table, the six
steps untouched), `README.md`, `HANDOFF.md`.

Untouched on purpose: `IDENTITY.md`, `lib/data.ts`, `lib/fake-compiler.ts`,
`fixtures/*`, `app/globals.css`, `app/icon.svg`, `components/ui/*`,
`public/brand/*`, `scripts/seed.mjs`.

**Commands run.** None, this phase was file edits only.

**Phase 1's three open questions, resolved.**

1. **Landing page reading `@/lib/data` directly. Resolved.** `app/page.tsx` is
   now async and reads `getCloseState()`. Its open count subtracts the journal's
   closures, so the two screens cannot disagree. Text and layout are unchanged.
2. **`adoptModelRule` not bounding `maxAbsDelta`. Resolved.** The bound is in,
   `<=` plus `1e-9`, skipped when `requireBatchSumMatch` is true or the action is
   `split_match`. `fixtures/precedent/late_settlement.json` carries `0.02`
   against a 0.00 tolerance and is now rejected, which pushes that pattern onto
   the deterministic draft. HANDOFF 3B's "exercise the rejection path on purpose"
   is covered by `tests/precedent.test.ts`; the ten live runs are still unrun.
3. **Reset, settlement sequence and precedents living in React state. Resolved
   for the persistence half, unverified for the rest.** All four now write to the
   journal and all four hydrate from it. Whether a real Neon instance returns
   them correctly has not been checked by anyone yet.

**Open questions.**

1. `postgresStore` has never been run against a real database. The SQL and the
   drizzle schema were written by hand and kept in step by eye. The first
   `npm run db:push` is the first time either is tested.
2. `getCloseState()` swallows a store failure and serves the seed. That is the
   right behaviour for a demo, but it means a misconfigured `DATABASE_URL` looks
   exactly like a fresh close on screen. The only signal is one `[core] store
   unavailable, serving the seed` line in the server log.
3. The autonomy meter counts `summary.closedByCarriedPrecedents` (38) plus the
   non-human closures in `statuses`. After a reload that is still correct, but
   `raised` counts `summary.exceptionsRaised + live.length`, so a close that
   accumulates many pulled settlements across sessions will move the denominator.
   That is arguably right and is untested past three pulls.
4. `drizzle-orm` 0.36 accepts the object return form for table constraints and
   deprecates it in a later minor. If `npm install` resolves something newer than
   the pinned caret allows, `lib/db/schema.ts` is the file to look at first.

**Next best step (written at the end of Phase 2).** Phase 3 should take HANDOFF 3D, the measurement view: a small
results section fed by the same `getCloseState()` journal showing exceptions
raised, closed with no human, autonomy before and after, and human touches. The
data is now durable, so those numbers can be read back rather than recomputed
from React state, which is what makes them checkable against the README table.
Before that, the runner has to actually run `npm install`, `npm run build`,
`npm test`, and one Neon round trip, because none of this phase is verified.

---

### Phase 3, 6 September 2026: the whole demo path on the real flow

**Goal.** Make all six DEMO.md steps survive `ADAPTER_MODE=real`, which is the
mode the recorded submission has to run in. Bound the compile step to a budget a
camera can sit through, put the checked-in fixture into the real chain so a
provider outage cannot take the recording off script, run step 6 against the real
Dodo feed with a fixture underneath it, give both demo routes a named skeleton,
error and empty branch, guard the write path, and add one command that puts the
whole system back to 24 open exceptions at 61 percent.

**Status.** All five slices done. Nothing was cut. **Not verified by me: nothing
in this phase was executed, because the session had file tools only.**
`npm install`, `npm run build`, `npm test`, `npm run demo:reset` and the browser
are all unrun. Read every claim below as "written", not "proven".

**What is real now.**

- The compile call is bounded to `COMPILE_TIMEOUT_MS` (6000) with
  `COMPILE_RETRIES` (0). `fetchOnce` in `lib/agent.ts` takes `timeoutMs` and
  `retries` as parameters, defaulting to the generous upstream pair, and
  `compileWithAnthropic` passes the tight one.
- `compileWithClaudeCli` returns `null` immediately when `RUNNING_ON_VERCEL`.
  The binary is not installed there, so the spawn probe could only cost the
  recording time.
- `compilePrecedent` is four rungs: anthropic, claude-cli, fixture, deterministic.
  The fixture rung calls `compilePrecedentFromFixtures` and is returned with
  `elapsedMs` recomputed against the chain's own clock.
- `fetchLatestSettlement` asks Dodo for `?page_size=10&status=succeeded`, maps
  the page, and hands it to `pickSettlement`, which filters on `usableForDemo`
  and walks the survivors by sequence. The fixture fallback and its one
  `console.warn` live in the same function.
- Both demo routes have a named triad: `CloseQueueSkeleton`, `HomeSkeleton`,
  `RouteErrorState` (retry through `reset()`), `QueueErrorState` (retry through
  `retryFailed`, which reruns whichever of `compile` or `pullSettlement` failed)
  and `QueueEmptyState` (whose call to action is the settlement pull).
- Every journal write carries an `idempotencyKey`, minted inside `persist` so a
  call site cannot forget one, required by `journalRequestSchema` on all four
  ops, and checked by `markJournalWrite` before the route touches the store.
- `npm run demo:reset` exists and works with or without `DATABASE_URL`.

**What is still mocked or fallback.**

- The three fixture settlements in `lib/dodo.ts` are still what the demo runs on
  unless `DODO_PAYMENTS_API_KEY` is set. `pickSettlement` has never seen a real
  Dodo response body, and the `items` / `data` envelope guess from Phase 1 is
  still a guess.
- `fixtures/precedent/` is still the compiler in fake mode, and is now also the
  third rung in real mode.
- `lib/data.ts` is still the only source of the 24 open exceptions, the 62
  raised, the 38 carried closures and the six patterns.
- HANDOFF 3D, the measurement view, is untouched. The README table is still
  written by hand rather than read back from the journal.

**Decisions.**

1. **Persistence stays Postgres on Neon behind `lib/store.ts`**, from the
   "relational reads the demo filters or joins" row of the decision table. The
   KV row was rejected because steps 4, 5 and 6 write three related row sets
   (precedents, closures, live exceptions) that step 1 reads back joined after a
   reload, and a key-value store would have meant reassembling that join in
   application code on every render. The "none" row was rejected in Phase 2 for
   the reason the pitch turns on: a precedent that does not survive a reload is
   not a precedent. Nothing in this phase moved that line, and no route or
   component imports `postgres` or `drizzle-orm` directly.
2. **There is no chain state, so there is no on-chain half to reset.** This repo
   has no `contracts/` directory, no wallet dependency and no on-chain fixture.
   `scripts/demo-reset.mjs` says so in its header and the README says so under
   the command. The close journal is the only mutable state Obiter has.
3. **The fixture sits above the deterministic draft, not below it.** Both are
   offline, so the ordering is not about availability. It is about which rule
   appears on screen: the fixture is the recorded `emit_precedent` answer that
   compiles to "PREC-03: Rounding shortfall up to $2.00, Northwind Group", which
   is what DEMO.md step 3 quotes, and the draft is named from the controller's
   own inputs and would read differently. Both go through `adoptModelRule`.
4. **Six seconds, zero retries.** DEMO.md allows the compile five seconds of
   feel. A retry inside the Anthropic rung would double the worst case to twelve
   and buy nothing the next rung does not buy faster, so the next compiler in the
   chain is the retry. This is the one call the whole recording waits on.
5. **`markJournalWrite` is honest about being half a solution.** It is a `Set` in
   one server process capped at `JOURNAL_KEY_MAX`, so it catches a double click
   that lands twice on the same instance and catches nothing across instances or
   after a restart. The durable half is the natural keys already in
   `lib/store.ts`: `onConflictDoUpdate` on `precedents`, `onConflictDoNothing` on
   `closures` and `live_exceptions`. The comment in `lib/cache.ts` says exactly
   that rather than implying the cache is the guarantee.
6. **`persist` mints the key, callers do not.** `JournalRequest` requires
   `idempotencyKey` on every member, and `persist` takes a distributive
   `WithoutKey<JournalRequest>` so the four call sites stay as they were. A plain
   `Omit` over that union would have collapsed the `op` discriminator.
7. **The apply and revert pending flags are real but their window is one tick.**
   Both functions are synchronous (`persist` is fire and forget), so React
   batches `"applying"` and `"idle"` into one render and the button is never seen
   disabled. They are still bound to pending state rather than to a timeout, as
   the gate requires, and the actual double-click protection is that a second
   apply finds `proposal` already null and a second revert finds the precedent
   already gone. The idempotency key covers the case where two requests do get
   out of the browser.
8. **`components/close-queue.tsx` is committed with slice 4, not slice 3.** It
   carries both the two new state components and the idempotency key, and git
   commits whole files. Putting it in the slice 4 commit means both commits are
   independently type-clean, because the key it sends and the `JournalRequest`
   that requires it land together.
9. **`lib/config.ts` rides in the first commit and carries `JOURNAL_KEY_MAX`
   too.** `lib/cache.ts` in commit 4 imports it, and a constant that is unused
   for two commits is cheaper than a commit whose import does not resolve.
10. **`tests/schemas.test.ts` was edited, not deleted.** Two of its cases parsed
    a bare `{ op: "reset" }`, which the new schema rejects. They were rewritten
    into one case that pins the rejection of a keyless write and one that accepts
    both ops when a key is present.

**Failed attempts.** None. No error resisted two corrections, because nothing was
executed. Read that as "untested", not as "clean".

**Files changed.**

Created: `app/loading.tsx`, `scripts/demo-reset.mjs`, `.farm-commits.json`.

Edited: `lib/config.ts` (three compile constants, `RUNNING_ON_VERCEL`,
`JOURNAL_KEY_MAX`), `lib/agent.ts` (parameterised `fetchOnce`, the Vercel skip,
the fixture rung), `lib/dodo.ts` (`usableForDemo`, `pickSettlement`, the page
request, the fallback warning), `lib/cache.ts` (`markJournalWrite`),
`lib/schemas.ts`, `lib/types.ts`, `app/api/close/journal/route.ts`,
`app/close/loading.tsx` (the export name only), `app/error.tsx` (the export name
only), `app/page.tsx` (`next/image` on the illustration),
`components/close-queue.tsx`, `tests/schemas.test.ts`, `package.json`,
`.env.example`, `README.md`, `CLAUDE.md`, `HANDOFF.md`.

Untouched on purpose: `IDENTITY.md`, `DEMO.md` (the six steps and the routes
table are the contract), `lib/data.ts`, `lib/precedent.ts`, `lib/store.ts`,
`lib/db/*`, `drizzle/0000_init.sql`, `lib/adapters.ts`, `lib/fake-compiler.ts`,
`app/api/settlements/route.ts`, `app/api/precedent/route.ts`,
`app/close/page.tsx`, `app/layout.tsx`, `app/globals.css`, `app/icon.svg`,
`components/ui/*`, `public/brand/*`, `scripts/seed.mjs`, `scripts/db-seed.mjs`,
`scripts/db-push.mjs`.

**Commands run.** None. This session had Write, Edit, Read, Glob and Grep only.

**Tripwire grep counts, run by me over the repo.**

- The 24 banned hex values: zero hits under `app/` and `components/`. One hit in
  `IDENTITY.md` line 21, which is the DIFFERS_FROM sentence naming them as the
  palettes that were rejected.
- `fade-up`, `float`, `float-y`, `glow-pulse`, `caret-blink`, `pulse-dot`,
  `--delay`, `--d`, `backdrop-blur`, `bg-*/85`: zero hits repo-wide except the
  same `IDENTITY.md` line.
- `@keyframes`: exactly two, `obiter-wipe` and `obiter-stamp`, both in
  `app/globals.css`.
- Hex literals under `app/`: `app/globals.css` (the nine tokens) and
  `app/icon.svg` (the mark, which CLAUDE.md already exempts). Zero under
  `components/`.
- `<Image` with a `/brand/` src: exactly one, `app/layout.tsx:51`. The landing
  illustration is `/illustrations/ledger-rule.svg`.
- `useEffect` in `components/close-queue.tsx`: zero.
- `process.env`: `lib/config.ts` and `scripts/*.mjs` only. `node:fs`,
  `writeFileSync`, `readFileSync`: `scripts/` only.
- `from "postgres"` / `from "drizzle-orm`: `lib/db/*`, `lib/store.ts` and
  `scripts/*.mjs` only. No route, no component.

**Acceptance items I could not meet by reading.**

1. Everything that needs a command. `npm run build`, `npm test`,
   `npm run demo:reset`, the three consecutive DEMO.md walks, the deliberately
   wrong key take, and the Vercel walk at 375px are all the runner's or the
   human's, and none of them has been run.
2. The apply and revert disabled props exist and are bound to pending state, but
   as decision 7 says, the disabled state never renders because both functions
   are synchronous. Do not describe them on camera as a spinner.
3. `pickSettlement` is written against the Dodo response envelope guessed in
   Phase 1 (`items` then `data`). If the live feed returns a different envelope,
   `mapDodoPayments` gets an empty array, `pickSettlement` returns null, and the
   fixture answers with a warning in the log. That is the right failure, but it
   means a wrong envelope looks exactly like an empty test account.

**Open questions.**

1. Nothing from Phase 2's open questions was closed. `postgresStore` still has
   not met a real database, a misconfigured `DATABASE_URL` still looks like a
   fresh close, and the autonomy denominator still grows with pulled settlements.
2. `app/loading.tsx` is the root segment's loading UI, so it also covers any
   future route that does not bring its own. Today that is only `/`, because
   `/close` has `app/close/loading.tsx`. A third page would need its own.
3. `markJournalWrite` lives in `lib/cache.ts` next to the compile cache. Both are
   in-process Maps or Sets, so they belong together, but if a third one appears
   the file should be split rather than grown.
4. `usableForDemo` rejects a payment that is not short. On the real Dodo test
   feed most payments settle in full, so the live path may fall to the fixture
   more often than not. That is the designed behaviour, not a failure, but it
   means the "Source: Dodo Payments test environment" evidence line will
   frequently read "local settlement fixture" instead. Worth knowing before the
   recording.

**Next best step.** HANDOFF 3D, the measurement view. The journal now carries
every number the README table claims: exceptions raised, closures with no human,
autonomy before and after, and human touches, all durable across a reload and all
already computed in `components/close-queue.tsx` from state that now comes out of
`getCloseState()`. Read them back into a small section rather than recomputing
them, so a judge can watch a number move during the demo and then read the same
number in the README. Requirement 7 asks for exactly that and the judges weight
reliability at 25 percent.
