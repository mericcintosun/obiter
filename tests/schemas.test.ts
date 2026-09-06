// The edges reject what they should.
//
// Every handler parses before it does anything else, so these are the cases that
// decide whether a bad request is a 400 with a sentence or a 500 with a stack.

import { describe, expect, it } from "vitest";
import { journalRequestSchema, settlementQuerySchema } from "@/lib/schemas";

describe("journalRequestSchema", () => {
  it("rejects an op it does not know", () => {
    const parsed = journalRequestSchema.safeParse({ op: "delete_everything" });
    expect(parsed.success).toBe(false);
  });

  it("rejects a revert with no precedent id", () => {
    const parsed = journalRequestSchema.safeParse({ op: "revert" });
    expect(parsed.success).toBe(false);
  });

  it("rejects a revert whose precedent id is not a precedent id", () => {
    const parsed = journalRequestSchema.safeParse({ op: "revert", precedentId: "EXC-0142" });
    expect(parsed.success).toBe(false);
  });

  it("rejects a write with no idempotency key", () => {
    // Every op carries one. A ledger write with no key is a write the route
    // cannot deduplicate, which is exactly the double click this guards.
    expect(journalRequestSchema.safeParse({ op: "revert", precedentId: "PREC-03" }).success).toBe(
      false
    );
    expect(journalRequestSchema.safeParse({ op: "reset" }).success).toBe(false);
  });

  it("accepts a well formed revert and a reset when both carry a key", () => {
    const idempotencyKey = "9f2c1d64-0c4e-4c2a-9a7e-2b1f4d6e8a10";
    expect(
      journalRequestSchema.safeParse({ op: "revert", precedentId: "PREC-03", idempotencyKey })
        .success
    ).toBe(true);
    expect(journalRequestSchema.safeParse({ op: "reset", idempotencyKey }).success).toBe(true);
  });
});

describe("settlementQuerySchema", () => {
  it("rejects a sequence that is not a number", () => {
    const parsed = settlementQuerySchema.safeParse({ seq: "soon" });
    expect(parsed.success).toBe(false);
  });

  it("rejects an exception id that is not shaped like one", () => {
    const parsed = settlementQuerySchema.safeParse({ seq: "0", id: "not-an-exception" });
    expect(parsed.success).toBe(false);
  });

  it("reads the query string the close screen actually sends", () => {
    const parsed = settlementQuerySchema.safeParse({ seq: "2", id: "EXC-0903" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.seq).toBe(2);
      expect(parsed.data.id).toBe("EXC-0903");
    }
  });

  it("defaults the sequence to zero when the query string is empty", () => {
    const parsed = settlementQuerySchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.seq).toBe(0);
  });
});
