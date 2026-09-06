# VIDEO

The recording script. Derived from `DEMO.md`, which is the cross-phase contract:
if a shot below disagrees with `DEMO.md`, the shot is wrong, not the contract.
`DEMO.md` was not edited to produce this file.

**Length.** 3 to 4 minutes. The table below totals 3:17. Devpost's stated range
is 3 to 5 minutes and **300 seconds is the hard ceiling**: at 5:01 a judge is
entitled to stop watching, so anything that pushes past 4:00 comes out of the
architecture shots, never out of shots 7 or 8.

**Two shots are eliminatory and neither is negotiable.**

1. **Shot 8, the AO dashboard with the total session count on screen.** The rules
   page says AO usage is mandatory for eligibility and is verified through the
   submission and the demo. If the session count is not legible in the frame, all
   ten prize rows fall. Record it from the real dashboard, not from a slide, and
   do not stage it after the build.
2. **Shot 7, the measured result panel at `/close#measures`.** That is submission
   requirement 7, the measurable result, and it is the one moment where the
   number a judge just watched move is printed next to the number it started at.

**Before the take.** Run `npm run demo:reset`, which puts the close back at 24
open exceptions and 61 percent. Set `ADAPTER_MODE=real` with a live
`ANTHROPIC_API_KEY`: that is the path the submitted recording has to run on.
Record at 1280 wide. Kill any stale `next start` by port first.

---

## The shot list

| # | Shot | DEMO step | On-screen action | Spoken line | Seconds | Ends at |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Cold open on the queue | 1 | `/close`. The heading "Exception queue", the sentence reading 62 raised and 38 closed at a 61 percent autonomy rate, the meter filled to 61, and 24 ruled rows under it. | "At month end the matcher clears the easy lines and leaves these 24. The problem is not that they are hard. It is that last month's reasoning was never written down anywhere a machine could read it, so this list gets worked from scratch every month." | 16 | 0:16 |
| 2 | The record | 2 | Click the first row, Northwind Freight BV, a $1.65 shortfall. Show the four evidence lines including the quoted EUR rate of 1.0912 against our booked 1.0927, then the "Why this reached you" line. | "One exception. Their bank converted at its own rate and landed a dollar sixty five short. The engine collected all of that and still refused to decide, because no precedent covers this counterparty group." | 14 | 0:30 |
| 3 | Compile | 3 | Press "Compile a precedent". The rule card headed "PREC-03: Rounding shortfall up to $2.00, Northwind Group", the mono JSON with kind, conditions, scope and action, the line naming which compiler wrote it and in how many milliseconds, and "This will close 7 open exceptions" with the seven ids listed. | "I resolve it the way I would anyway. Claude compiles that decision once, into a typed rule with a schema behind it, and it tells me by id exactly which seven it will touch before it touches anything." | 9 | 0:39 |
| 4 | **Apply, the wow moment** | 4 | Press "Apply PREC-03 to the queue". Seven rows go closed with the PREC-03 seal stamped in each margin, the amounts turn from warn to forest, the meter moves 61 to 71, and the audit trail gains "PREC-03 applied. 7 exceptions closed, 6 of them without a human looking at the record." | "One decision, seven records, six of them closed with nobody looking at them. Autonomy moved because the queue moved, not because a slide said so." | 12 | 0:51 |
| 5 | The seal and the revert | 5 | Click a PREC-03 badge. The inspector, the rule name, the rationale, "It has touched 7 records", all seven by id, counterparty and amount. Press "Revert this precedent": the same seven return to the open queue and the meter falls to 61. Apply it again. | "Every closure names the rule that made it. If I do not like the rule, one click takes back everything it ever touched, in a single pass, and the audit trail records the reversal. That is the part a controller has to have before any of this is signable." | 22 | 1:13 |
| 6 | Money that closes itself | 6 | Press "Pull latest settlement". Row EXC-0901 for Northwind Freight BV, invoice INV-2026-0791, short by $1.29, arriving already closed under PREC-03, and the audit line "EXC-0901 arrived from the settlement feed and closed under PREC-03. No human touched it." | "New money arrives through the Dodo test feed while the period is still open. It matches the precedent I wrote ninety seconds ago and closes itself. Nobody looked at it." | 16 | 1:29 |
| 7 | **The measured result** (eliminatory) | 7 | Scroll to "What has changed while you watched" at `/close#measures`. Four ruled rows, the left column reading 24, 38 of 62, 61 percent and 0, the right column carrying what the queue shows now, in forest where the line improved. | "Here is the same close as a before and after, read off the same journal the queue renders from. Open exceptions, closures with no human on them, autonomy, and the human touches it cost. These four numbers are in the README and they are these numbers." | 18 | 1:47 |
| 8 | **The AO dashboard** (eliminatory) | none | The Agent Orchestrator dashboard with the **total session count on screen and legible**. Show the worker sessions: matching engine, precedent compiler, close interface, seed pipeline. | "The build itself ran on AO: one orchestrator session with the engine, the compiler, the interface and the seed each split into their own worker. That is the session count." | 22 | 2:09 |
| 9 | The guard rail | none | Terminal, `npm test`. `tests/precedent.test.ts` passing, showing the seven pinned ids. Then `lib/precedent.ts`, the `adoptModelRule` scope and tolerance rejection. | "A model wrote that rule once. Everything after it is deterministic, and a test pins the exact seven ids the demo just closed. A rule that tries to widen its own scope, or exceed the tolerance I stated, is thrown out rather than patched." | 20 | 2:29 |
| 10 | The architecture | none | The mermaid diagram in `README.md`, then `lib/adapters.ts`, showing the one seam every page and route goes through. | "One seam. The seed and the payments feed go in, the compiler chain and the close journal sit behind it, and the two pages know nothing else. Swapping the offline compiler for the live one is one environment variable." | 18 | 2:47 |
| 11 | The landing page | none | `/` at 1280. The fold: the claim, the dateline, the live state sentence with the counted autonomy figure, the CTA, and the ruled ledger plate under it. Scroll through the pattern sparkline. | "The landing page reads the same close through the same seam, so the number on the marketing page and the number in the product cannot disagree." | 16 | 3:03 |
| 12 | Close | none | The repo, the live URL, `SECURITY.md`, and the team names on screen. | "Obiter. One decision becomes a rule you can read, apply, audit and take back. The code and the deployed close are both at the links on screen." | 14 | 3:17 |

---

## If a step misbehaves on camera

Every fallback below is a still frame cut into the timeline, not a retake of the
whole video, and each one is captured **during the dry run** so it exists before
you need it.

| Step | What can go wrong | Fallback |
| --- | --- | --- |
| 3, compile | The Anthropic call times out at 6 seconds and the chain falls to the checked-in fixture. | Nothing to do. The fixture is the same PREC-03 the script quotes and it passes the same `adoptModelRule` guard, so the shot is still honest. Say "the compiler chain fell to the recorded answer" only if the on-screen compiler label shows it. |
| 4, apply | The journal write fails and the audit trail says the screen is ahead of the record. | Cut to the screenshot of the applied queue taken during the dry run. Do not narrate the failure line; it is a persistence detail, not a product claim. |
| 6, settlement | The Dodo test feed returns nothing usable and the fixture answers instead. The evidence line will read "local settlement fixture". | Keep rolling and say the feed is in test mode. Do not claim a live Dodo call the frame does not show. |
| 7, measures | A previous take left closures in the journal, so the left column is below 24. | Stop, run `npm run demo:reset`, and retake this shot alone. The left column has to read 24, 38 of 62, 61 percent, 0 to match the README. |
| 8, AO | The dashboard is slow or the count is not legible at the recording resolution. | Zoom the browser to 150 percent and hold the frame for a full four seconds. This shot may not be replaced by a still: it is the eliminatory one and it has to be the live dashboard. |
| any | A modal, a notification or a stale tab appears. | Cut. Record in a clean private window with notifications off. |

There is no tracing or observability integration in this codebase. Do not put one
on camera and do not describe one in the voiceover.

## Schedule

| Slot | What | Minutes |
| --- | --- | --- |
| 1 | Dry run, no recording. Walk all seven `DEMO.md` steps at `ADAPTER_MODE=real`, with a browser reload between steps 4 and 5 to prove the close survives it. Capture every fallback still listed above while you do it. | 15 |
| 2 | Take one. `npm run demo:reset` first. | 10 |
| 3 | Re-record slot. Held open on purpose: budget one full retake of shots 1 to 7, which is where the clicking is. Reset between takes. | 15 |
| 4 | Cut, add the voiceover, check the total is under 4:00 and hard under 5:00, export. | 20 |

## Last check before upload

- [ ] Shot 8 is in the cut and the AO session count is readable at 100 percent zoom.
- [ ] Shot 7 is in the cut and the left column reads 24, 38 of 62, 61 percent, 0.
- [ ] The problem is stated by 0:20 and the seven rows close by 0:45.
- [ ] Total runtime is between 3:00 and 4:00, and under 300 seconds either way.
- [ ] No step outside the five routes in `DEMO.md` appears on screen.
- [ ] No API key, no `.env.local`, and no terminal scrollback with a key in it is in frame.
- [ ] The published link is pasted into `README.md` and `SUBMISSION.md` in place of `<ADD_VIDEO_URL>`.
