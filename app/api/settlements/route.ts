import { NextResponse } from "next/server";
import { adapterMode, getLatestSettlement } from "@/lib/adapters";
import { settlementToException } from "@/lib/dodo";
import type { ApiError, SettlementResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Pulls the newest settlement and hands back the exception the matching engine
 * would raise for it. The close screen calls this to show what happens to money
 * that arrives after the queue is already on screen.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const sequence = Number.parseInt(params.get("seq") ?? "0", 10) || 0;
  const exceptionId = params.get("id") ?? `EXC-9${String(sequence).padStart(3, "0")}`;

  try {
    const settlement = await getLatestSettlement(sequence);
    const exception = settlementToException(settlement, exceptionId);

    // Where this money came from is part of the record, so it is stated on the
    // evidence the controller reads rather than hidden in a server log.
    exception.evidence = [...exception.evidence, `Adapter mode: ${adapterMode()}.`];

    const payload: SettlementResponse = { settlement, exception };
    return NextResponse.json(payload);
  } catch (error) {
    const failure: ApiError = {
      error: error instanceof Error ? error.message : "Settlement feed unavailable.",
    };
    return NextResponse.json(failure, { status: 502 });
  }
}
