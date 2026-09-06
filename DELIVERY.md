# DELIVERY

Nothing in this file is read by code. It is the submission checklist for the human who fills in the Devpost form.

One Devpost project, one track. The three rows below are placement rows on the same Track 2 submission, not separate bounties, so selecting the track once enters all three. There is no extra integration to build for any of them.

---

## Track 2 - 1st Place - Cash Prize by Maximor

- `entryMode:` opt-in
- `action:` select the track "Autonomous Office of the CFO" (Track 2) on the single Devpost project form at https://syndicate-by-maximor.devpost.com/ . One project per team, one track per project.
- `deadline:` Sunday 6 September 2026, 18:00 EDT (the rules page time, which is earlier than the registry's 23:59 UTC, so it binds)
- `watch:` step 3

Prize: `$1,000 in cash`. Slots: 1. Required tech: `AO (Agent Orchestrator)`.

## Track 2 - 1st Place - Dodo Payments Credits

- `entryMode:` opt-in
- `action:` select the track "Autonomous Office of the CFO" (Track 2) on the single Devpost project form at https://syndicate-by-maximor.devpost.com/ . One project per team, one track per project.
- `deadline:` Sunday 6 September 2026, 18:00 EDT (the rules page time, which is earlier than the registry's 23:59 UTC, so it binds)
- `watch:` step 6

Prize: `$1,000 in credits`. Slots: 1. Required tech: `AO (Agent Orchestrator)`.

## Track 2 - 2nd Place - Dodo Payments Credits

- `entryMode:` opt-in
- `action:` select the track "Autonomous Office of the CFO" (Track 2) on the single Devpost project form at https://syndicate-by-maximor.devpost.com/ . One project per team, one track per project.
- `deadline:` Sunday 6 September 2026, 18:00 EDT (the rules page time, which is earlier than the registry's 23:59 UTC, so it binds)
- `watch:` step 6

Prize: `$500 in credits`. Slots: 1. Required tech: `AO (Agent Orchestrator)`.

---

## Why Dodo stays load-bearing

`lib/dodo.ts` is the whole data path of DEMO.md step 6. `app/api/settlements/route.ts` imports `settlementToException` from it directly (line 4) and reaches `fetchLatestSettlement` through `getLatestSettlement` in `lib/adapters.ts` (line 32 of that file). Delete `lib/dodo.ts` and step 6 has neither the money nor the exception it turns into, so the two Dodo credit rows lose the thing they are watching.

## Rows deliberately not entered

- **`Track 2 - AI Grants India Credits`.** AI Grants India is open to people building in India and this team is not. Expected value about $1.25, which does not pay for a claim that would not survive verification.
- **Every Track 1 row.** The rules page says a project may enter only one track. The derived field for Track 1 is more than twice as crowded for the same money, so Track 2 is the better seat. Restoring a Track 1 row means re-entering under a different track, not a code change.

---

## Before submitting

- Paste the live URL https://obiter-app.vercel.app and the repo https://github.com/mericcintosun/obiter into the form.
- Replace `<ADD_TEAM_MEMBER_NAMES>` in README.md with every team member's name, and list every member on the form.
- Replace `<ADD_VIDEO_URL>` in README.md with the published video link.
- The video is 3 to 5 minutes and **must show the AO dashboard with the session count on screen, because AO usage is eliminatory.**
- Confirm on the form whether resubmission is allowed before you submit, because the registry says it is not.
- The landing page and the rules page disagree about eligibility (student restriction and company entries), so read the form's own text rather than either page.
