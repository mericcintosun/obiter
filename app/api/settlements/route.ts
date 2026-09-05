import { NextResponse } from "next/server";
import { adapterMode, getLatestSettlement } from "@/lib/adapters";
import { LOG_PREFIX } from "@/lib/config";
import { settlementToException } from "@/lib/dodo";
import { fail } from "@/lib/errors";
import { settlementQuerySchema } from "@/lib/schemas";
import type { SettlementResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Pulls the newest settlement and hands back the exception the matching engine
 * would raise for it. The close screen calls this to show what happens to money
 * that arrives after the queue is already on screen.
 */
export async function GET(request: Request) {
  const parsed = settlementQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  );

  if (!parsed.success) {
    return NextResponse.json(
      fail("invalid_input", "Ask for a settlement with a sequence number and an exception id."),
      { status: 400 }
    );
  }

  const { seq } = parsed.data;
  const exceptionId = parsed.data.id ?? `EXC-9${String(seq).padStart(3, "0")}`;
  const startedAt = Date.now();

  try {
    const settlement = await getLatestSettlement(seq);
    const exception = settlementToException(settlement, exceptionId);

    // Where this money came from is part of the record, so it is stated on the
    // evidence the controller reads rather than hidden in a server log.
    exception.evidence = [...exception.evidence, `Adapter mode: ${adapterMode()}.`];

    const payload: SettlementResponse = { settlement, exception };

    // The payer name and the amount are the controller's data, so the log gets
    // the ids and the timing and nothing else.
    console.log(
      `${LOG_PREFIX} settlement pulled exception=${exception.id} seq=${seq} source=${settlement.source} elapsedMs=${
        Date.now() - startedAt
      }`
    );

    return NextResponse.json(payload);
  } catch {
    console.warn(`${LOG_PREFIX} settlement feed failed seq=${seq}`);
    return NextResponse.json(
      fail("upstream_error", "The settlement feed did not answer, so no money was pulled."),
      { status: 502 }
    );
  }
}
