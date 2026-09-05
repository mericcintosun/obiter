import { NextResponse } from "next/server";
import { compilePrecedent } from "@/lib/agent";
import { nextPrecedentId, previewPrecedent, type ControllerDecision } from "@/lib/precedent";
import type { ReconException } from "@/lib/data";

// The compiler spawns the local `claude` CLI when no API key is present, so
// this handler needs the Node runtime rather than the edge one.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CompileBody {
  exception?: ReconException;
  decision?: ControllerDecision;
  queue?: ReconException[];
  existingPrecedentIds?: string[];
}

export async function POST(request: Request) {
  let body: CompileBody;
  try {
    body = (await request.json()) as CompileBody;
  } catch {
    return NextResponse.json({ error: "Body was not valid JSON." }, { status: 400 });
  }

  const { exception, decision, queue, existingPrecedentIds } = body;
  if (!exception?.id || !decision?.action || !Array.isArray(queue)) {
    return NextResponse.json(
      { error: "Send an exception, a controller decision, and the open queue." },
      { status: 400 }
    );
  }

  const input = {
    exception,
    decision,
    queue,
    nextId: nextPrecedentId(existingPrecedentIds ?? []),
    compiledAt: new Date().toISOString(),
  };

  const result = await compilePrecedent(input);

  // The preview is computed here, on the same executor the apply step uses, so
  // the count the controller approves is the count that happens.
  return NextResponse.json({
    rule: result.rule,
    source: result.source,
    elapsedMs: result.elapsedMs,
    rejectedModelOutput: result.rejectedModelOutput ?? null,
    wouldClose: previewPrecedent(result.rule, queue),
  });
}
