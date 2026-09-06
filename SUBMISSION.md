# SUBMISSION

Every field of the Devpost form, in the form's order, ready to paste. Nothing in
this file is read by code. Two placeholders are left for the human at the form:
https://obiter-app.vercel.app/demo-video.mp4 and `<ADD_TEAM_MEMBER_NAMES>`. Fill both before you submit.

Every claim below is limited to what the recording actually shows. If a sentence
here is not on screen in the video, cut the sentence rather than the shot.

---

## 1. Project name

```
Obiter
```

## 2. Elevator pitch

Devpost caps this field at 200 characters. The line below is 180.

```
A controller resolves one reconciliation exception. Obiter compiles that decision into a named rule, closes every matching exception in the queue, and puts a revert under each one.
```

## 3. Track

Select exactly one. Paste this string:

```
Track 2 - Autonomous Office of the CFO
```

One project per team and one track per project, so no Track 1 row is claimed.

## 4. Project description

### The problem

At month-end close, bank activity and invoices never agree. The deterministic
matcher clears the easy 90 percent and leaves a residue: underpayments, currency
moves between the invoice date and the settlement date, one transfer covering
three invoices, money that lands two days after the cutoff, a fee charged twice,
a payment referencing a purchase order instead of an invoice.

Somebody works that residue by hand, every month, from scratch. The work is not
hard. The problem is that last month's reasoning was never written down anywhere
a machine could read it, so when the same customer underpays by the same euro
next month, the same line lands back in the queue and gets the same thirty
seconds of thought.

### The target user

The controller at a 10 to 50 person company, who is one person, and the close
team at an accounting firm, who are three or four people doing the same job
across many entities. The seeded close in the app is a fair example of what
either of them opens: Halden Analytics, August 2026, 220 bank lines against 210
invoices, 62 exceptions raised, 38 already closed by precedents carried in from
June and July, 24 still open across six patterns, autonomy at 61 percent.

### What it does

Obiter is a case reporter for the close. You resolve one exception the way you
already would. Obiter compiles that decision into a typed JSON rule with a name,
conditions, a tolerance, a scope and a written reason, then applies it to the
open queue immediately. Three things follow:

1. **Retroactive application.** Before the rule runs it lists, by id, exactly
   which open exceptions it will touch.
2. **Provenance.** Every closed record carries the id of the precedent that
   closed it, stamped visibly in the margin of the row.
3. **Reversal.** Reverting a precedent returns every record it ever touched to
   the open queue in one pass, and the audit trail records the reversal.

Money that arrives while the period is still open enters through the Dodo
Payments test feed, becomes an exception like any other, and closes under an
active precedent with nobody looking at the record.

### The agent architecture

One model call, in exactly one place.

- `lib/agent.ts` is the only file in the running app that reaches a model. It
  calls Claude once per controller decision with the precedent JSON schema handed
  over as a tool definition, so the compiler is a structured-output call rather
  than prose parsing.
- The chain under it has four rungs, tried in order: the Anthropic API, then a
  local `claude` CLI, then the recorded `emit_precedent` answers in
  `fixtures/precedent/`, then a deterministic draft built from the controller's
  own inputs. Every rung hands its answer to the same Zod schema and the same
  `adoptModelRule` guard in `lib/precedent.ts`, which rejects a rule that widens
  its own scope or exceeds the tolerance the controller stated.
- After the compile, no model is involved in any outcome. `matchesPrecedent` and
  `previewPrecedent` are deterministic, which is why the same queue always
  produces the same closures and why a judge can check the count by hand.
- `lib/adapters.ts` is the seam every page and route goes through, switched by
  `ADAPTER_MODE`. `fake` replays the fixtures with no key and no network; `real`
  runs the live chain and the Postgres journal.

### The tools

| Tool | Where it runs |
| --- | --- |
| Claude, structured output through a tool definition | `lib/agent.ts`, one call per decision |
| Zod rule schema and the scope and tolerance guard | `lib/precedent.ts` |
| The deterministic matcher and preview | `lib/precedent.ts` |
| Dodo Payments test mode, settlement feed | `lib/dodo.ts` |
| Postgres on Neon through Drizzle, the close journal | `lib/store.ts`, `lib/db/*` |

### The workflows

1. Open `/close`. 24 exceptions, autonomy at 61 percent, computed from the queue
   on screen.
2. Open EXC-0142, a $1.65 shortfall from Northwind Freight BV, and read the four
   evidence lines the engine collected and the reason it escalated.
3. Compile. PREC-03 appears with its conditions, the compiler that wrote it, the
   milliseconds it took, and the sentence naming the 7 exceptions it will close.
4. Apply. Seven rows close, each stamped PREC-03, and the meter moves from 61 to
   71 percent.
5. Click a seal, read the seven touched records, revert, watch all seven come
   back and the meter fall to 61, then apply again.
6. Pull a settlement. New money arrives, matches PREC-03, and closes with no
   human involved.
7. Read the measured result panel at `/close#measures`.

### How it was evaluated

Two things, both checkable by a judge without trusting us.

**A pinned invariant.** `tests/precedent.test.ts` asserts that PREC-03, compiled
from EXC-0142 at a $2.00 tolerance on the Northwind counterparty group, closes
exactly `EXC-0142, EXC-0144, EXC-0149, EXC-0151, EXC-0158, EXC-0163, EXC-0166`,
by id. If a change to the executor would close a record the controller did not
ask for, that test fails before the recording does. `tests/schemas.test.ts` pins
the edge rejections and `tests/security.test.ts` pins the scope-widening and
prompt-injection rejections. `npm test` runs all of them.

**A before and after table, read off the running app.** The measured result panel
at `/close#measures` prints four lines with the close as it was opened in the
left column and the close as it stands now in the right one. It is fed by the
same journal the queue renders from, so the number a judge watches move during
the demo is the same number the README table claims.

| | Before | After three decisions |
| --- | --- | --- |
| Open exceptions needing a human | 24 | 0 across three patterns, 11 in the remaining three |
| Records closed with no human looking at them | 38 of 62 | 51 of 62 |
| Autonomy | 61 percent | 82 percent |
| Human touches | 24 | 3 |

Clearing all six patterns takes it to 56 of 62, which is 90 percent, on six human
touches.

### What is honest about the limits

The seeded close is fictional and Obiter stores no customer records and no
payment data of its own. Without a Dodo key the settlement feed serves three
local fixtures. Without a database the close journal lives in process memory and
resets when the server does. All three are stated in the app, in the README and
in `SECURITY.md`.

## 5. Built with

```
next.js, react, typescript, tailwindcss, shadcn-ui, zod, drizzle-orm, postgres, neon, claude, anthropic, dodo-payments, vercel, vitest
```

## 6. Try it out links

```
https://obiter-app.vercel.app/close
https://obiter-app.vercel.app
https://github.com/mericcintosun/obiter
```

The demo starts at `/close`. The landing page is context for a reader and is not
part of the recorded flow.

## 7. Video demo link

```
https://obiter-app.vercel.app/demo-video.mp4
```

The shot list, the spoken lines and the timings are in
[`docs/VIDEO.md`](docs/VIDEO.md). Two shots in it are eliminatory: the AO
dashboard with the total session count on screen, and the measured result panel
at `/close#measures`.

## 8. Team members

```
<ADD_TEAM_MEMBER_NAMES>
```

List every member by name on the form as well as here. The rules require it and
the team size cap is not stated anywhere, so check the form's own text.

## 9. Opt-in rows, carried from DELIVERY.md

All three are placement rows on this one Track 2 submission, not separate
bounties. Selecting the track once enters all three, and there is no extra
integration to build for any of them.

| Bounty | Prize | entryMode | Watch in the video |
| --- | --- | --- | --- |
| `Track 2 - 1st Place - Cash Prize by Maximor` | `$1,000 in cash` | opt-in | DEMO step 3 |
| `Track 2 - 1st Place - Dodo Payments Credits` | `$1,000 in credits` | opt-in | DEMO step 6 |
| `Track 2 - 2nd Place - Dodo Payments Credits` | `$500 in credits` | opt-in | DEMO step 6 |

`action:` select the track "Autonomous Office of the CFO" (Track 2) on the single
Devpost project form at https://syndicate-by-maximor.devpost.com/ .

`deadline:` Sunday 6 September 2026, 18:00 EDT. The rules page time is earlier
than the registry's 23:59 UTC, so it binds.

Rows deliberately not entered: `Track 2 - AI Grants India Credits`, because that
grant is open to people building in India and this team is not; and every Track 1
row, because a project may enter only one track.

## 10. Before you press submit

- [ ] https://obiter-app.vercel.app/demo-video.mp4 replaced here and in `README.md`.
- [ ] `<ADD_TEAM_MEMBER_NAMES>` replaced here and in `README.md`.
- [ ] Track 2 selected on the form.
- [ ] Repo link and live link pasted.
- [ ] The AO dashboard with the session count is on screen in the video.
- [ ] Confirmed on the form whether resubmission is allowed, because the registry
      record says it is not.
- [ ] Read the form's own eligibility text. The landing page and the rules page
      disagree about the student restriction and about company entries.
