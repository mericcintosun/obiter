import { NextResponse } from "next/server";
import { compilePrecedentViaAdapter } from "@/lib/adapters";
import { nextPrecedentId, previewPrecedent } from "@/lib/precedent";
import type {
  ApiError,
  CompilePrecedentResponse,
  ControllerDecision,
  ReconException,
} from "@/lib/types";

// In real mode the compiler spawns the local `claude` CLI when no API key is
// present, so this handler needs the Node runtime rather than the edge one.
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
    const failure: ApiError = { error: "Body was not valid JSON." };
    return NextResponse.json(failure, { status: 400 });
  }

  const { exception, decision, queue, existingPrecedentIds } = body;
  if (!exception?.id || !decision?.action || !Array.isArray(queue)) {
    const failure: ApiError = {
      error: "Send an exception, a controller decision, and the open queue.",
    };
    return NextResponse.json(failure, { status: 400 });
  }

  const input = {
    exception,
    decision,
    queue,
    nextId: nextPrecedentId(existingPrecedentIds ?? []),
    compiledAt: new Date().toISOString(),
  };

  const result = await compilePrecedentViaAdapter(input);

  // The preview is computed here, on the same executor the apply step uses, so
  // the count the controller approves is the count that happens.
  const payload: CompilePrecedentResponse = {
    rule: result.rule,
    source: result.source,
    elapsedMs: result.elapsedMs,
    rejectedModelOutput: result.rejectedModelOutput ?? null,
    wouldClose: previewPrecedent(result.rule, queue),
  };
  return NextResponse.json(payload);
}
