# CLAUDE.md

Permanent working notes for any agent session opened at this repo root. Read
`IDENTITY.md` before touching a component and `DEMO.md` before touching a route.

## Commands

```bash
npm install     # install dependencies
npm run dev     # local server on http://localhost:3000
npm run build   # production build, must pass with zero TypeScript errors
npm test        # vitest, run once. Pins the seven id PREC-03 preview.
npm run seed    # writes fixtures/close-august-2026.json from lib/data.ts
npm run db:push # applies drizzle/0000_init.sql to DATABASE_URL
npm run db:seed # clears the journal for OBITER_CLOSE_ID, back to the baseline
npm run demo:reset # puts the demo back at 24 open exceptions, 61 percent
```

`npm run build` and `npm test` are the two gates. Neither database script is
needed to run the app: without `DATABASE_URL` the close journal lives in the
in-process store in `lib/store.ts`.

## Stack pitfalls

- **Next.js 15, App Router.** Route `params` and `searchParams` are Promises and
  must be awaited. Server components are the default.
- **TypeScript strict.** `tsconfig.json` has `"strict": true` and
  `"resolveJsonModule": true`. The path alias is `@/*` mapped to `./*`.
- **Tailwind v4.** Tokens live in `@theme` inside `app/globals.css`. There is no
  `tailwind.config.js` and there are no `@tailwind` directives. The single
  `@import "tailwindcss"` at the top of `app/globals.css` is the whole setup.
- **shadcn primitives live in `components/ui`.** If a primitive is missing, write
  it there in the same shadcn form rather than styling something inline.
- **Client boundary.** Any file using `useState`, `useEffect`, `usePathname`, or
  an event handler starts with `"use client"` on line one.
- **Colors.** Nine hex values exist in the repo and they all sit in
  `app/globals.css` (plus the mark in `app/icon.svg`). Nothing under `app/` or
  `components/` may carry a hex literal. Use the tokens: `bg-ground`,
  `bg-surface`, `border-border`, `text-ink`, `text-seal`, `text-second`,
  `text-ok`, `text-warn`, `text-bad`, `text-muted-foreground`.

## Vercel guardrails

Later phases inherit these. Breaking one is a deploy failure, not a lint warning.

1. **No filesystem writes at request time.** Build scripts and `npm run seed` may
   write; a route handler, a server component, or a server action may not.
2. **`useSearchParams` only under a `Suspense` boundary.** Without one the whole
   route opts out of static rendering and the build errors.
3. **No Node-only API on an edge path.** `lib/agent.ts` spawns a child process,
   so any route reaching it declares `export const runtime = "nodejs"`.
4. **No custom server and no `output: export`.** The app is deployed as a normal
   Next.js App Router project.
5. **`lib/config.ts` is the only file under `lib/`, `app/` or `components/` that
   reads `process.env`, and every key it reads is mirrored in `.env.example`.**
   Currently `ADAPTER_MODE`, `DATABASE_URL`, `OBITER_CLOSE_ID`,
   `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_URL`,
   `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_API_BASE`, `VERCEL`. `VERCEL` is set
   by the platform and read only as `RUNNING_ON_VERCEL`; never set it by hand.
   Scripts under
   `scripts/*.mjs` read the environment directly, because they run under plain
   node and never ship to a browser. Never commit a real key, and never give one
   a `NEXT_PUBLIC_` prefix.

## Architecture, in one paragraph

`lib/data.ts` is the seed and has no imports. `lib/precedent.ts` holds the Zod
rule schema, the JSON Schema handed to the model, and the deterministic executor
(`matchesPrecedent`, `previewPrecedent`, `draftPrecedent`, `adoptModelRule`); do
not refactor the executor. `lib/adapters.ts` is the seam every page and route
goes through, switched by `ADAPTER_MODE` (`fake` by default, `real` for the live
Claude chain and Postgres). `lib/fake-compiler.ts` replays the checked-in
fixtures in `fixtures/precedent/` through the same `adoptModelRule` validation a
live model answer gets. `lib/agent.ts` is the only place a model runs.
`lib/store.ts` is the close ledger: one `CloseStore` interface, an in-process
`memoryStore` (the default) and a `postgresStore` over `lib/db/*`, and
`getCloseState()` composes the seed with whichever one answers. `lib/config.ts`
holds every environment read and every named constant; `lib/errors.ts` holds the
`ErrorCode` union and the `{ error, hint }` failure body every handler returns;
`lib/schemas.ts` holds the zod schemas each route parses with before it does
anything else.

**Server-only files.** `lib/store.ts`, `lib/db/client.ts`, `lib/db/schema.ts`,
`lib/agent.ts` and `lib/config.ts` are never imported by a page or a
`"use client"` file. Every consumer reaches them through `lib/adapters.ts` or an
API route.

## Folders never to touch

- `public/brand/*`. The raster mark is fixed and there is exactly one brand image
  in the app, inside the home link in `app/layout.tsx`.
- `components/ui/*`, except to add a new primitive in shadcn form.
- The key block at the top of `IDENTITY.md`. Append a dated line under
  Amendments if you truly must.

## Compaction

When compacting preserve the list of modified files and test commands.
