// The three close ledger tables, as drizzle sees them.
//
// This file is the typed mirror of drizzle/0000_init.sql. There is no
// drizzle-kit in this repo on purpose: the schema is small enough that a hand
// written SQL file is easier to read than a generated migration folder, and it
// means `npm run db:push` is one plain statement list a reviewer can check.
// Change one file, change the other in the same commit.
//
// Server only. Nothing under app/ or components/ imports this; everything
// reaches it through lib/store.ts, which lib/adapters.ts owns.

import { boolean, integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import type { PrecedentRule, ReconException } from "@/lib/types";

/** One compiled rule. `status` goes to 'reverted' rather than being deleted. */
export const precedents = pgTable(
  "precedents",
  {
    id: text("id").notNull(),
    closeId: text("close_id").notNull(),
    rule: jsonb("rule").$type<PrecedentRule>().notNull(),
    source: text("source").notNull(),
    elapsedMs: integer("elapsed_ms").notNull(),
    compiledFrom: text("compiled_from").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.closeId, table.id] }),
  })
);

/** One exception closed under one precedent. The provenance the revert reads. */
export const closures = pgTable(
  "closures",
  {
    closeId: text("close_id").notNull(),
    exceptionId: text("exception_id").notNull(),
    precedentId: text("precedent_id").notNull(),
    humanDecided: boolean("human_decided").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.closeId, table.exceptionId] }),
  })
);

/** A settlement that arrived while the period was open, in exception shape. */
export const liveExceptions = pgTable(
  "live_exceptions",
  {
    closeId: text("close_id").notNull(),
    id: text("id").notNull(),
    payload: jsonb("payload").$type<ReconException>().notNull(),
    sequence: integer("sequence").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.closeId, table.id] }),
  })
);
