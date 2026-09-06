import { NextResponse } from "next/server";
import { markJournalWrite } from "@/lib/cache";
import { LOG_PREFIX } from "@/lib/config";
import { fail } from "@/lib/errors";
import { journalRequestSchema } from "@/lib/schemas";
import { closeStore } from "@/lib/store";

// lib/store.ts reaches a Postgres driver, so this handler declares the Node
// runtime. `force-dynamic` because a ledger write is never a cached response.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reads the body without throwing. An unparseable body is just `null`. */
async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * The close ledger's only write endpoint.
 *
 * The client calls this after it has already updated the screen, and never waits
 * on the answer. That is the right order for a close queue: the controller's
 * click is the decision, and this is the record of it. If the record fails, the
 * screen says so in the audit trail rather than rolling back under the cursor.
 */
export async function POST(request: Request) {
  const parsed = journalRequestSchema.safeParse(await readJson(request));

  if (!parsed.success) {
    return NextResponse.json(
      fail("invalid_input", "That was not a close ledger entry this app knows how to write."),
      { status: 400 }
    );
  }

  const entry = parsed.data;

  // The idempotency check. A key this instance has already written is a repeat,
  // so it is acknowledged and dropped rather than replayed into the store.
  if (!markJournalWrite(entry.idempotencyKey)) return NextResponse.json({ ok: true, duplicate: true });

  const store = closeStore();

  try {
    if (entry.op === "apply") {
      await store.recordApply({
        rule: entry.rule,
        closedIds: entry.closedIds,
        humanDecidedId: entry.humanDecidedId,
        source: entry.source,
        elapsedMs: entry.elapsedMs,
      });
      console.log(
        `${LOG_PREFIX} journal apply ${entry.rule.id} closed=${entry.closedIds.length}`
      );
    } else if (entry.op === "revert") {
      await store.recordRevert(entry.precedentId);
      console.log(`${LOG_PREFIX} journal revert ${entry.precedentId}`);
    } else if (entry.op === "settlement") {
      await store.recordSettlement({
        exception: entry.exception,
        sequence: entry.sequence,
        closedByPrecedentId: entry.closedByPrecedentId,
      });
      console.log(
        `${LOG_PREFIX} journal settlement ${entry.exception.id} seq=${entry.sequence} closedBy=${
          entry.closedByPrecedentId ?? "none"
        }`
      );
    } else {
      await store.reset();
      console.log(`${LOG_PREFIX} journal reset`);
    }
  } catch {
    // No stack, no driver message. The controller gets one sentence and the
    // screen keeps whatever it already shows.
    console.warn(`${LOG_PREFIX} journal write failed op=${entry.op}`);
    return NextResponse.json(
      fail("store_unavailable", "The close ledger did not answer, so this step was not saved."),
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true });
}
