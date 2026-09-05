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

export type CompilerSource = "anthropic" | "claude-cli" | "deterministic";

export interface CompileResult {
  rule: PrecedentRule;
  source: CompilerSource;
  /** Set when a model answered but its output failed validation. */
  rejectedModelOutput?: string;
  elapsedMs: number;
}

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

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

async function compileWithAnthropic(input: DraftInput): Promise<PrecedentRule | { error: string } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
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

  if (!response.ok) {
    return { error: `Anthropic API returned ${response.status}` };
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; name?: string; input?: unknown }>;
  };
  const toolUse = payload.content?.find((block) => block.type === "tool_use" && block.name === "emit_precedent");
  if (!toolUse) return { error: "Model answered without calling emit_precedent" };

  const adopted = adoptModelRule(toolUse.input, input);
  return adopted ?? { error: "Model output failed the precedent schema" };
}

let cliAvailable: boolean | null = null;

function runCommand(command: string, args: string[], stdin?: string, timeoutMs = 45_000): Promise<string> {
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

async function compileWithClaudeCli(input: DraftInput): Promise<PrecedentRule | { error: string } | null> {
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
    if (start === -1 || end <= start) return { error: "Local claude CLI returned no JSON object" };
    const adopted = adoptModelRule(JSON.parse(raw.slice(start, end + 1)), input);
    return adopted ?? { error: "Local claude CLI output failed the precedent schema" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Local claude CLI failed" };
  }
}

export async function compilePrecedent(input: DraftInput): Promise<CompileResult> {
  const startedAt = Date.now();
  let rejected: string | undefined;

  for (const attempt of [
    { source: "anthropic" as const, run: compileWithAnthropic },
    { source: "claude-cli" as const, run: compileWithClaudeCli },
  ]) {
    let outcome: PrecedentRule | { error: string } | null = null;
    try {
      outcome = await attempt.run(input);
    } catch (error) {
      outcome = { error: error instanceof Error ? error.message : "compiler call failed" };
    }
    if (outcome === null) continue;
    if ("error" in outcome) {
      rejected = outcome.error;
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
