// What the edges accept.
//
// Every route handler in this app parses its input with one of these before it
// does anything else, so a malformed body is a 400 with a plain sentence rather
// than a 500 with a stack trace, and nothing downstream has to defend itself
// against a field that is not there.
//
// The schemas are exported rather than inlined into the handlers so a test can
// import them and check the rejection cases without standing up a server.
//
// This file is the only place the wire shapes are written down twice: once here
// as a parser, once in lib/types.ts as the TypeScript type the client uses. They
// are kept in step by hand and both are small.

import { z } from "zod";
import { exceptionKinds, precedentActions, precedentRuleSchema, precedentScopeLevels } from "@/lib/precedent";

/** One reconciliation exception, exactly as lib/data.ts defines it. */
export const reconExceptionSchema = z.object({
  id: z.string().min(1).max(40),
  kind: z.enum(exceptionKinds),
  counterparty: z.string().min(1).max(120),
  counterpartyGroup: z.string().min(1).max(120),
  invoiceNumber: z.string().min(1).max(60),
  invoiceAmount: z.number(),
  receivedAmount: z.number(),
  currency: z.string().length(3),
  invoiceDate: z.string().min(4).max(40),
  settlementDate: z.string().min(4).max(40),
  daysApart: z.number().int().min(0).max(3650),
  priorOccurrences: z.number().int().min(0).max(1000),
  evidence: z.array(z.string().max(400)).max(20),
  blockedReason: z.string().max(400),
});

/** What the controller chose on the screen before the compiler ran. */
export const controllerDecisionSchema = z.object({
  exceptionId: z.string().min(1).max(40),
  action: z.enum(precedentActions),
  toleranceAmount: z.number().min(0).max(250000),
  scopeLevel: z.enum(precedentScopeLevels),
  rationale: z.string().max(400),
  decidedBy: z.string().min(2).max(80),
});

/** POST /api/precedent. */
export const compileRequestSchema = z.object({
  exception: reconExceptionSchema,
  decision: controllerDecisionSchema,
  queue: z.array(reconExceptionSchema).max(500),
  existingPrecedentIds: z.array(z.string().max(20)).max(200).optional(),
});

/**
 * POST /api/close/journal. One entry per ledger write, discriminated on `op`, so
 * an unknown op is rejected by the parser rather than falling through a switch.
 */
export const journalRequestSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("apply"),
    rule: precedentRuleSchema,
    closedIds: z.array(z.string().min(1).max(40)).max(500),
    humanDecidedId: z.string().min(1).max(40).nullable(),
    source: z.string().max(40).optional(),
    elapsedMs: z.number().int().min(0).max(600000).optional(),
  }),
  z.object({
    op: z.literal("revert"),
    precedentId: z.string().regex(/^PREC-\d{2,3}$/),
  }),
  z.object({
    op: z.literal("settlement"),
    exception: reconExceptionSchema,
    sequence: z.number().int().min(0).max(9999),
    closedByPrecedentId: z.string().regex(/^PREC-\d{2,3}$/).nullable(),
  }),
  z.object({
    op: z.literal("reset"),
  }),
]);

/** GET /api/settlements. Both values arrive as strings on the query string. */
export const settlementQuerySchema = z.object({
  seq: z.coerce.number().int().min(0).max(9999).default(0),
  id: z
    .string()
    .regex(/^EXC-\d{3,4}$/)
    .optional(),
});

export type CompileRequest = z.infer<typeof compileRequestSchema>;
export type JournalRequestInput = z.infer<typeof journalRequestSchema>;
export type SettlementQuery = z.infer<typeof settlementQuerySchema>;
