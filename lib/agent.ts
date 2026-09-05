// The precedent compiler: the one place a language model touches Obiter.
//
// It runs exactly once per controller decision, and its only job is to turn
// that decision into a typed rule. Everything downstream (matching, closing,
// reverting) is deterministic, so a model that is slow, absent, or wrong can
// never change what the queue does with a record.
//
// Priority chain, in order:
//   1. Claude via the Anthropic API when ANTHROPIC_API_KEY is set. This is the
//      path the recorded demo has to run on.
//   2. The developer's local `claude` CLI, so the loop is real with zero keys.
//   3. The deterministic draft in lib/precedent.ts.
//
// Whatever comes back is validated against the zod schema before it is adopted.

import { spawn } from "node:child_process";
import {
  adoptModelRule,
  draftPrecedent,
  precedentActionLabels,
  precedentJsonSchema,
  precedentScopeLabels,
  type DraftInput,
  type PrecedentRule,
} from "@/lib/precedent";
import { exceptionKindLabels, formatMoney, shortfall, shortfallPct } from "@/lib/data";
import {
  ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL,
  ANTHROPIC_URL,
  CLI_TIMEOUT_MS,
  UPSTREAM_RETRIES,
  UPSTREAM_TIMEOUT_MS,
} from "@/lib/config";
import { fail, type Failure } from "@/lib/errors";

// "fixture" is produced by lib/fake-compiler.ts, which replays a recorded
// emit_precedent answer through the same adoptModelRule validation this file
// applies to a live one. It is a compiler in the chain, not a bypass around it.
export type CompilerSource = "anthropic" | "claude-cli" | "fixture" | "deterministic";

export interface CompileResult {
  rule: PrecedentRule;
  source: CompilerSource;
  /** Set when a model answered but its output failed validation. */
  rejectedModelOutput?: string;
  elapsedMs: number;
}

/**
 * One upstream call, bounded twice: a hard timeout on each attempt, and exactly
 * one retry. UPSTREAM_RETRIES is 1 and the loop is a counted `for`, so this can
 * run at most twice no matter what the far end does. A model that hangs cannot
 * hold a close screen open, and a transient 502 does not cost the demo a take.
 */
async function fetchOnce(url: string, init: RequestInit): Promise<Response> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= UPSTREAM_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      // A 5xx is the far end failing, not us. Anything else is an answer.
      if (response.status >= 500 && attempt < UPSTREAM_RETRIES) continue;
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < UPSTREAM_RETRIES) continue;
    }
  }

  throw lastError ?? new Error("upstream did not answer");
}

/** Maps a thrown fetch error onto the closed ErrorCode union. */
function upstreamFailure(error: unknown, what: string): Failure {
  const name = error instanceof Error ? error.name : "";
  if (name === "TimeoutError" || name === "AbortError") {
    return fail("upstream_timeout", `${what} did not answer in time, so the offline compiler ran instead.`);
  }
  return fail("upstream_error", `${what} could not be reached, so the offline compiler ran instead.`);
}

function buildPrompt(input: DraftInput): string {
  const { exception, decision, queue } = input;
  const sameKind = queue.filter((e) => e.kind === exception.kind && e.id !== exception.id);

  const lines = [
    "You are the precedent compiler inside a month-end close tool.",
    "A controller has just resolved one reconciliation exception by hand.",
    "Write the reusable matching rule that decision implies. Write it once, narrow.",
    "",
    "THE EXCEPTION THE CONTROLLER RESOLVED",
    `id: ${exception.id}`,
    `pattern: ${exceptionKindLabels[exception.kind]}`,
    `counterparty: ${exception.counterparty} (group: ${exception.counterpartyGroup})`,
    `invoice ${exception.invoiceNumber}: ${formatMoney(exception.invoiceAmount, exception.currency)}`,
    `received: ${formatMoney(exception.receivedAmount, exception.currency)}`,
    `shortfall: ${formatMoney(shortfall(exception), exception.currency)} (${shortfallPct(exception).toFixed(3)} percent)`,
    `days between due date and settlement: ${exception.daysApart}`,
    `times this counterparty produced the same pattern in the last six closes: ${exception.priorOccurrences}`,
    `evidence the engine collected:`,
    ...exception.evidence.map((line) => `  - ${line}`),
    "",
    "THE CONTROLLER'S DECISION",
    `action: ${precedentActionLabels[decision.action]}`,
    `tolerance they set: ${formatMoney(decision.toleranceAmount, exception.currency)}`,
    `scope they chose: ${precedentScopeLabels[decision.scopeLevel]}`,
    `their note: ${decision.rationale || "(none written)"}`,
    "",
    "OTHER OPEN EXCEPTIONS WITH THE SAME PATTERN",
    ...(sameKind.length > 0
      ? sameKind.map(
          (e) =>
            `  ${e.id} ${e.counterparty} (${e.counterpartyGroup}) shortfall ${formatMoney(
              shortfall(e),
              e.currency
            )} at ${shortfallPct(e).toFixed(3)} percent, ${e.daysApart} days late`
        )
      : ["  (none)"]),
    "",
    "RULES YOU MUST FOLLOW",
    `1. scope.level must be exactly "${decision.scopeLevel}". Never widen it.`,
    `2. kind must be exactly "${exception.kind}".`,
    "3. Tolerances must be tight enough that a record the controller would want to see never closes silently.",
    "4. requireBatchSumMatch is true only for a batched remittance being split.",
    "5. The rationale is for an auditor reading this in six months. Two sentences at most.",
    "",
    "Call the emit_precedent tool with the rule. Do not reply with prose.",
  ];
  return lines.join("\n");
}

/** One outcome of one compiler in the chain: a rule, a typed failure, or "not here". */
type CompilerOutcome = PrecedentRule | Failure | null;

async function compileWithAnthropic(input: DraftInput): Promise<CompilerOutcome> {
  if (!ANTHROPIC_API_KEY) return null;

  let response: Response;
  try {
    response = await fetchOnce(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        tool_choice: { type: "tool", name: "emit_precedent" },
        tools: [
          {
            name: "emit_precedent",
            description: "Emit the compiled precedent rule for this controller decision.",
            input_schema: precedentJsonSchema,
          },
        ],
        messages: [{ role: "user", content: buildPrompt(input) }],
      }),
    });
  } catch (error) {
    return upstreamFailure(error, "The Anthropic API");
  }

  if (!response.ok) {
    // The status is the whole message. A provider body may carry account
    // details or an echoed prompt, so it never reaches a screen or a log.
    return fail("upstream_error", `The Anthropic API answered with status ${response.status}.`);
  }

  let payload: { content?: Array<{ type: string; name?: string; input?: unknown }> };
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    return fail("parse_failure", "The Anthropic API answered with something that was not JSON.");
  }

  const toolUse = payload.content?.find((block) => block.type === "tool_use" && block.name === "emit_precedent");
  if (!toolUse) return fail("parse_failure", "The model answered without calling emit_precedent.");

  const adopted = adoptModelRule(toolUse.input, input);
  return (
    adopted ??
    fail(
      "parse_failure",
      "The model wrote a rule that failed the precedent schema or reached past the tolerance the controller set."
    )
  );
}

let cliAvailable: boolean | null = null;

function runCommand(
  command: string,
  args: string[],
  stdin?: string,
  timeoutMs = CLI_TIMEOUT_MS
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`${command} timed out`));
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => (out += String(chunk)));
    child.stderr?.on("data", (chunk) => (err += String(chunk)));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else reject(new Error(err || `${command} exited with ${code}`));
    });

    if (stdin !== undefined) child.stdin?.write(stdin);
    child.stdin?.end();
  });
}

async function hasClaudeCli(): Promise<boolean> {
  if (cliAvailable !== null) return cliAvailable;
  try {
    await runCommand("claude", ["--version"], undefined, 8_000);
    cliAvailable = true;
  } catch {
    cliAvailable = false;
  }
  return cliAvailable;
}

async function compileWithClaudeCli(input: DraftInput): Promise<CompilerOutcome> {
  if (!(await hasClaudeCli())) return null;

  const prompt = [
    buildPrompt(input),
    "",
    "There is no tool here. Reply with the rule as a single JSON object and nothing else.",
    "Keys: name, kind, conditions {maxAbsDelta, maxDeltaPct, maxDaysApart, currencies, requireBatchSumMatch}, scope {level, value}, action, rationale.",
  ].join("\n");

  try {
    const raw = await runCommand("claude", ["-p", "--output-format", "text", "--model", "haiku"], prompt);
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end <= start) {
      return fail("parse_failure", "The local claude CLI returned no JSON object.");
    }
    const adopted = adoptModelRule(JSON.parse(raw.slice(start, end + 1)), input);
    return (
      adopted ??
      fail(
        "parse_failure",
        "The local claude CLI wrote a rule that failed the precedent schema or reached past the stated tolerance."
      )
    );
  } catch {
    // The CLI's own stderr can echo the prompt, so it is not carried outward.
    return fail("upstream_error", "The local claude CLI did not produce a usable answer.");
  }
}

export async function compilePrecedent(input: DraftInput): Promise<CompileResult> {
  const startedAt = Date.now();
  let rejected: string | undefined;

  for (const attempt of [
    { source: "anthropic" as const, run: compileWithAnthropic },
    { source: "claude-cli" as const, run: compileWithClaudeCli },
  ]) {
    let outcome: CompilerOutcome = null;
    try {
      outcome = await attempt.run(input);
    } catch (error) {
      outcome = upstreamFailure(error, "The precedent compiler");
    }
    if (outcome === null) continue;
    if ("error" in outcome) {
      rejected = outcome.hint;
      continue;
    }
    return { rule: outcome, source: attempt.source, rejectedModelOutput: rejected, elapsedMs: Date.now() - startedAt };
  }

  return {
    rule: draftPrecedent(input),
    source: "deterministic",
    rejectedModelOutput: rejected,
    elapsedMs: Date.now() - startedAt,
  };
}
