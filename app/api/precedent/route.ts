import { NextResponse } from "next/server";
import { compilePrecedentViaAdapter } from "@/lib/adapters";
import { LOG_PREFIX } from "@/lib/config";
import { fail } from "@/lib/errors";
import { sameOriginOk } from "@/lib/http";
import { nextPrecedentId, previewPrecedent } from "@/lib/precedent";
import { compileRequestSchema } from "@/lib/schemas";
import type { CompilePrecedentResponse } from "@/lib/types";

// In real mode the compiler spawns the local `claude` CLI when no API key is
// present, so this handler needs the Node runtime rather than the edge one.
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

export async function POST(request: Request) {
  // First, before the body is even read: this route reaches a paid model, so a
  // page on another site does not get to spend the close's compile budget.
  if (!sameOriginOk(request)) {
    return NextResponse.json(
      fail("invalid_input", "The compiler only accepts decisions from the close screen itself."),
      { status: 403 }
    );
  }

  const parsed = compileRequestSchema.safeParse(await readJson(request));

  if (!parsed.success) {
    return NextResponse.json(
      fail("invalid_input", "Send an exception, a controller decision, and the open queue."),
      { status: 400 }
    );
  }

  const { exception, decision, queue, existingPrecedentIds } = parsed.data;
  const startedAt = Date.now();
  console.log(
    `${LOG_PREFIX} compile requested exception=${exception.id} action=${decision.action} queue=${queue.length}`
  );

  const result = await compilePrecedentViaAdapter({
    exception,
    decision,
    queue,
    nextId: nextPrecedentId(existingPrecedentIds ?? []),
    compiledAt: new Date().toISOString(),
  });

  // The preview is computed here, on the same executor the apply step uses, so
  // the count the controller approves is the count that happens.
  const payload: CompilePrecedentResponse = {
    rule: result.rule,
    source: result.source,
    elapsedMs: result.elapsedMs,
    rejectedModelOutput: result.rejectedModelOutput ?? null,
    wouldClose: previewPrecedent(result.rule, queue),
  };

  // Ids and counts only. The rule body, the prompt and the model answer stay off
  // the log, because one of them is the controller's own commercial data.
  console.log(
    `${LOG_PREFIX} compile ok rule=${payload.rule.id} source=${payload.source} wouldClose=${payload.wouldClose.length} elapsedMs=${
      Date.now() - startedAt
    }`
  );

  return NextResponse.json(payload);
}
