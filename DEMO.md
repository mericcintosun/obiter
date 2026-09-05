# DEMO.md, the cross-phase contract

This file is the shot list every later phase builds against. If a change breaks a
step below, the change is wrong, not the step. Phase 9 derives the recording
script from this file without editing it.

## The frame

**Problem, one sentence.** At month-end close the deterministic matcher clears
the easy lines and leaves a residue that one person works through by hand every
month from scratch, because last month's reasoning was never written down
anywhere a machine could read it.

**Trigger.** A controller opens the August 2026 close for Halden Analytics: 220
bank lines against 210 invoices, 62 exceptions raised, 38 already closed by the
precedents PREC-01 and PREC-02 carried in from June and July, 24 still open
across six patterns, autonomy sitting at 61 percent.

**Wow moment.** One resolved exception becomes a named rule that closes six more
in front of the judge, with a revert button under every closure.

**Closing frame.** The seal is clicked, the seven touched records are listed,
revert puts all seven back, the precedent is applied again, and then a live
settlement is pulled that closes under the same rule with nobody looking at it.
Autonomy is a number computed from the queue on screen, not a slide.

## Demo start route

**`/close`** (`app/close/page.tsx`). The video opens there. The landing page at
`/` (`app/page.tsx`) is context for a reader, not part of the recorded flow.

## The six steps

1. **The queue and the autonomy meter.** Route file `app/close/page.tsx`,
   rendering `components/close-queue.tsx`. On screen: the heading "Exception
   queue", the sentence reading "The matcher raised 62 exceptions, 38 of them
   closed with nobody looking at the record, which is an autonomy rate of 61
   percent", the meter bar under it filled to 61 percent, and 24 ruled rows.

2. **Open EXC-0142 and read the record.** Same file. Click the first row,
   Northwind Freight BV, a $1.65 shortfall. On screen: the "What the engine
   collected" list with the four evidence lines including the quoted EUR rate of
   1.0912 against our booked 1.0927, and under it the "Why this reached you"
   line carrying `blockedReason`: no policy precedent on file for a short payment
   on this counterparty group.

3. **Compile.** Press "Compile a precedent". The client posts to
   `app/api/precedent/route.ts`, which goes through `lib/adapters.ts`. On screen:
   the rule card headed "PREC-03: Rounding shortfall up to $2.00, Northwind
   Group", the mono JSON block with `kind`, `conditions`, `scope` and `action`,
   the line naming which compiler wrote it and in how many milliseconds, and the
   sentence "This will close 7 open exceptions" with the ids listed:
   EXC-0142, EXC-0144, EXC-0149, EXC-0151, EXC-0158, EXC-0163, EXC-0166.

4. **Apply.** Press "Apply PREC-03 to the queue". On screen: seven rows go to the
   closed state with a PREC-03 seal badge stamped on each, the amounts turn from
   warn to second, the autonomy meter moves from 61 percent to 71 percent (38
   carried closures plus the 6 PREC-03 closed with no human, over 62 raised), and
   the audit trail gains the line "PREC-03 applied. 7 exceptions closed, 6 of
   them without a human looking at the record."

5. **Click the seal and revert.** Click any PREC-03 badge. On screen: the
   precedent inspector, the rule name, the rationale, the line "It has touched 7
   records", and all seven listed by id, counterparty and amount. Press "Revert
   this precedent" and the same seven return to the open queue, the meter falls
   back to 61 percent, and the audit trail records the reversal. Apply it again
   before step 6.

6. **Money arrives and closes itself.** Press "Pull latest settlement". The
   client calls `app/api/settlements/route.ts`, which goes through
   `lib/adapters.ts` into `lib/dodo.ts`. On screen: a new row EXC-0901 for
   Northwind Freight BV, invoice INV-2026-0791, short by $1.29, arriving already
   closed under PREC-03, and the audit trail line "EXC-0901 arrived from the
   settlement feed and closed under PREC-03. No human touched it."

## Routes this demo is allowed to use

| Route | File |
| --- | --- |
| `/` | `app/page.tsx` |
| `/close` | `app/close/page.tsx` |
| `/api/precedent` | `app/api/precedent/route.ts` |
| `/api/settlements` | `app/api/settlements/route.ts` |
| `/api/close/journal` | `app/api/close/journal/route.ts` |

No other route may appear on camera. A phase that wants one adds it here first.

`/api/close/journal` never appears on screen. It is the write the client makes
after steps 4, 5 and 6 so that the close survives a reload: the same six steps,
still on the same screens, with the browser refreshable between any two of them.

## How the demo runs without accounts

`ADAPTER_MODE` defaults to `fake`, so step 3 compiles from the checked-in
fixtures in `fixtures/precedent/` and step 6 serves the fixture settlements in
`lib/dodo.ts`. The whole flow above is clickable on a laptop with no keys and no
network. Set `ADAPTER_MODE=real` with `ANTHROPIC_API_KEY` to run the live Claude
chain in `lib/agent.ts`, which is the path the submitted recording has to use.
Both paths return the same shape and both are validated by the same Zod schema
in `lib/precedent.ts`.
