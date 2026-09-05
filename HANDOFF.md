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
| `lib/agent.ts` | The compiler chain: Anthropic API, then local `claude` CLI, then deterministic. This is the only place a model runs. |
| `lib/dodo.ts` | The settlement feed. Real Dodo REST call when `DODO_PAYMENTS_API_KEY` is set, three fixtures otherwise. |
| `app/api/precedent/route.ts` | POST. Compiles a decision into a rule and returns the rule plus the exact ids it would close. |
| `app/api/settlements/route.ts` | GET. Pulls one settlement and returns it as an exception. |
| `components/ui/*` | shadcn primitives. `badge.tsx` gained `seal`, `closed`, and `pending` variants and square corners. |

**Real vs mocked**

- Real: the matching executor, the rule schema and its validation, retroactive application, provenance stamping, revert, the autonomy arithmetic (computed from the seed at render time, nothing hardcoded), and the Anthropic API call in `compileWithAnthropic`.
- Mocked or fallback: `fetchLatestSettlement` in `lib/dodo.ts` returns fixtures when no Dodo key is set, and the fixture list is what the demo currently runs on. `compilePrecedent` falls to `compileWithClaudeCli` and then `draftPrecedent` when no Anthropic key is set. There is no database: precedents live in React state and disappear on reload. That is the single biggest gap.

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
