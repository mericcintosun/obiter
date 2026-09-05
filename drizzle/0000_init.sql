-- Obiter, close ledger. Applied with `npm run db:push`.
--
-- Three tables, all keyed by close_id, because a precedent belongs to a close
-- and the whole point of the product is that it outlives the one it was written
-- in. Every statement is `create table if not exists`, so running this twice is
-- a no-op rather than an error.
--
-- lib/db/schema.ts mirrors this file as drizzle pgTable definitions. There is no
-- drizzle-kit in this repo, so the two are kept in step by hand: change one,
-- change the other in the same commit.

create table if not exists precedents (
  id text,
  close_id text,
  rule jsonb not null,
  source text not null,
  elapsed_ms integer not null,
  compiled_from text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  primary key (close_id, id)
);

create table if not exists closures (
  close_id text,
  exception_id text,
  precedent_id text not null,
  human_decided boolean not null,
  created_at timestamptz not null default now(),
  primary key (close_id, exception_id)
);

create table if not exists live_exceptions (
  close_id text,
  id text,
  payload jsonb not null,
  sequence integer not null,
  created_at timestamptz not null default now(),
  primary key (close_id, id)
);
