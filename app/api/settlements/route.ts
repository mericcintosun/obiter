import { NextResponse } from "next/server";
import { fetchLatestSettlement, settlementToException } from "@/lib/dodo";

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
    const settlement = await fetchLatestSettlement(sequence);
    return NextResponse.json({
      settlement,
      exception: settlementToException(settlement, exceptionId),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Settlement feed unavailable." },
      { status: 502 }
    );
  }
}
