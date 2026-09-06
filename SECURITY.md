# Security

Obiter is a close queue with three API routes on a public URL. This file is the
whole trust surface in one screen: what the app holds, what it talks to, what
can be written or spent, and where to send a report.

## What this app holds

No wallet, no smart contract, no chain, no on-chain fixture. There is no
`contracts/` directory in this repo and nothing here asks a browser for an
account, so a wallet scanner has nothing to warn about.

No personal data. The close in `lib/data.ts` is a fictional August 2026 close
for a company called Halden Analytics: 62 exceptions raised, 38 closed by
precedents carried in from June and July, 24 open across six patterns. The
counterparty names, invoice numbers and amounts in it were written for the demo.
There is no sign-up, no session, no cookie and no account, so the app collects
nothing from a visitor either.

The only mutable state is the close journal, in Postgres on Neon, scoped by
`OBITER_CLOSE_ID`. Three tables: `precedents` (the compiled rules), `closures`
(exception id, precedent id, whether a human decided it) and `live_exceptions`
(settlements pulled during the demo). Everything in them was produced by
somebody clicking the close screen. Without `DATABASE_URL` the same journal
lives in process memory and disappears with the server.

## Every credential and every outbound call

Three, and they are all in `lib/config.ts`:

| Where it goes | Base | Credential | What it sends |
| --- | --- | --- | --- |
| Anthropic Messages API | `ANTHROPIC_URL` | `ANTHROPIC_API_KEY` as `x-api-key` | One compile prompt per controller decision |
| Dodo Payments | `DODO_PAYMENTS_API_BASE` | `DODO_PAYMENTS_API_KEY` as a bearer token | A read of recent settlements, no write |
| Neon Postgres | `DATABASE_URL` | The connection string, `sslmode=require` | The close journal writes and reads |

`DODO_PAYMENTS_API_BASE` defaults to the test host
`https://test.dodopayments.com`. Pointing it at the live host is an explicit
opt-in, made by editing that one variable, and nothing in the app does it for
you. The Dodo call is a read of a settlement page; Obiter never moves money.

`lib/config.ts` is the only file under `app/`, `components/` and `lib/` that
reads `process.env`, and every key it reads is mirrored in `.env.example`.
Nothing carries a `NEXT_PUBLIC_` prefix, so no key can be inlined into a browser
bundle: the grep that proves it is `NEXT_PUBLIC_` over those three directories,
which returns one comment line in `lib/config.ts` and no code. The scripts under
`scripts/*.mjs` read the environment directly because they run under plain node
and never ship to a browser.

## Every endpoint that writes or spends, and its bound

| Route | What it does | Bounds |
| --- | --- | --- |
| `POST /api/precedent` | Compiles one decision into a rule. Reaches a paid model in real mode. | `compileRequestSchema` parses the body, the queue is capped at 500 exceptions, `max_tokens` is 1024, `COMPILE_TIMEOUT_MS` is 6000, `COMPILE_RETRIES` is 0, results are cached in process up to `COMPILE_CACHE_MAX`, and the same-origin guard runs before any of it |
| `POST /api/close/journal` | The one write endpoint for the close ledger. | A discriminated union on `op`, an idempotency key required on every op, `JOURNAL_KEY_MAX` keys remembered per instance, natural keys in `lib/store.ts` for the durable half, and the same-origin guard before the parse |
| `GET /api/settlements` | Reads one settlement and returns the exception for it. | Read only. `seq` is an integer 0 to 9999 and `id` must match `/^EXC-\d{3,4}$/` |

The same-origin guard is `sameOriginOk` in `lib/http.ts`, called as the first
statement of both POST handlers. A request with no `Origin` header passes, so
curl and server-to-server checks keep working; a request whose `Origin` names a
different host gets a 403. It is not on `GET /api/settlements`, which is
read-only and which browsers send without an `Origin` on a same-origin request
anyway.

**The `reset` op is destructive by design, and here is the honest version.**
`{"op":"reset"}` reaches `store.reset()` in `lib/store.ts`, which deletes every
row in `closures`, `live_exceptions` and `precedents` for one `CLOSE_ID`. It
exists because DEMO.md needs a reset button between takes. Three things bound
it: it is scoped to a single close id, it deletes only rows the demo itself
wrote and never the file seed in `lib/data.ts`, and since the same-origin guard
landed it cannot be driven from another site. What it still does not have is
per-visitor isolation: every visitor shares one close id, so one person's reset
clears the rows another person just created. The shortest real fix is a close id
minted per browser and carried on the request, which turns the shared ledger
into one ledger per visitor and makes the reset harmless by construction. That
is future work, not something this repo does today.

## Reporting and source

Source: <https://github.com/mericcintosun/obiter>. Open an issue there, or write
to the address on the repo owner's GitHub profile.

This is hackathon software. There is no production data behind it, no customer
of any kind, and the only account it can spend against is the one whose
Anthropic key the operator put in their own environment.
